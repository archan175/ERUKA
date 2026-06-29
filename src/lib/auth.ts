import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { BUILD_COMMIT } from "@/lib/buildInfo";

export type UserRole = "freelancer" | "recruiter";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
};

function mapSupabaseError(err: any): string {
  if (!err) return "An unknown error occurred.";
  // Supabase sometimes returns 429 or messages referencing rate limits
  if (err.status === 429 || /rate|limit|quota/i.test(err.message || "")) {
    return "Email provider rate limit reached. Try again later or contact support.";
  }
  // Authentication-specific messages
  if (/invalid login|invalid email|invalid password/i.test(err.message || "")) {
    return "Invalid email or password.";
  }
  return err.message || String(err);
}

const USERS_KEY = "eruka_users";
const SESSION_KEY = "eruka_session";
const PROFILE_KEY = "eruka_profile";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getRegisteredUsers(): AuthUser[] {
  if (!isBrowser()) return [];

  const rawUsers = window.localStorage.getItem(USERS_KEY);
  if (!rawUsers) return [];

  try {
    return JSON.parse(rawUsers) as AuthUser[];
  } catch {
    return [];
  }
}

export async function fetchRegisteredUsers(): Promise<AuthUser[]> {
  if (!isSupabaseConfigured || !supabase) return getRegisteredUsers();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,role")
    .order("created_at", { ascending: false });

  if (error || !data) return getRegisteredUsers();

  return data.map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  }));
}

function saveRegisteredUsers(users: AuthUser[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveCurrentUser(user: AuthUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  window.localStorage.setItem(SESSION_KEY, user.email.trim().toLowerCase());
  // Debug: trace what profile is saved during login flows
  try {
    // eslint-disable-next-line no-console
    console.debug('[auth] saveCurrentUser', { profileKey: PROFILE_KEY, sessionKey: SESSION_KEY, user });
  } catch (e) {
    // ignore
  }

  try {
    // Also keep the registered users list in sync so getCurrentUser can find the profile
    const users = getRegisteredUsers();
    const normalized = user.email.trim().toLowerCase();
    const existingIndex = users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === normalized);
    const toSave: AuthUser = { ...user, email: normalized };
    if (existingIndex >= 0) {
      users[existingIndex] = toSave;
    } else {
      users.unshift(toSave);
    }
    saveRegisteredUsers(users);
  } catch (e) {
    // best-effort only
  }
  try {
    // Persist the build stamp on login/save so the client can detect mismatched builds
    if (BUILD_COMMIT) {
      window.localStorage.setItem('eruka_build', String(BUILD_COMMIT));
      // eslint-disable-next-line no-console
      console.debug('[auth] saveCurrentUser set eruka_build', BUILD_COMMIT);
    }
  } catch (e) {
    // ignore
  }
  try {
    // notify the UI that auth state changed so non-mounted components can refresh
    window.dispatchEvent(new CustomEvent('eruka:auth-changed', { detail: { user } }));
  } catch (e) {
    // ignore
  }
}

function getAppOrigin() {
  if (!isBrowser()) return "";
  return window.location.origin;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false as const, message: "Supabase is not configured yet." };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false as const, message: mapSupabaseError(error) };
  }

  return { ok: true as const };
}

export async function sendPasswordReset(email: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false as const, message: "Supabase is not configured yet." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${getAppOrigin()}/reset-password`,
  });

  if (error) {
    return { ok: false as const, message: mapSupabaseError(error) };
  }

  return { ok: true as const };
}

export async function updatePassword(password: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false as const, message: "Supabase is not configured yet." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false as const, message: mapSupabaseError(error) };
  }

  return { ok: true as const };
}

export async function completeSupabaseLogin() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false as const, message: "Supabase is not configured yet." };
  }
  // First try to parse session from the OAuth redirect URL (contains tokens)
  try {
    // getSessionFromUrl will parse the access token from the URL hash and set the session
    // in the client. If there's nothing to parse it returns { data: null }
    // This is important for OAuth providers where the redirect includes tokens.
    // @ts-ignore - method exists on Supabase client; keeping runtime-safe call
    const fromUrl = await (supabase.auth as any).getSessionFromUrl?.();
    // ignore errors here, we'll call getUser below
  } catch (e) {
    // ignore
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return { ok: false as const, message: mapSupabaseError(error) || "Could not complete login." };
  }

  const authUser = data.user;
  const safeEmail = authUser.email || "unknown@example.com";
  const profile: AuthUser = {
    id: authUser.id,
    name:
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      safeEmail.split("@")[0],
    email: safeEmail,
    role: authUser.user_metadata?.role || "freelancer",
  };

  await supabase.from("profiles").upsert({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  });

  saveCurrentUser(profile);
  return { ok: true as const };
}

export async function signUpUser(newUser: AuthUser) {
  if (isSupabaseConfigured && supabase) {
    const normalizedEmail = newUser.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: newUser.password || "",
      options: {
        data: {
          name: newUser.name,
          role: newUser.role,
        },
      },
    });

    if (error) {
      // If network error (like paused project), fallback to local storage
      if (/failed to fetch|load failed/i.test(error.message)) {
        console.warn("Supabase network error, falling back to local storage.");
      } else {
        return { ok: false as const, message: mapSupabaseError(error) };
      }
    } else {
      const authUser = data.user;
      if (!authUser) {
        return { ok: false as const, message: "Could not create account." };
      }

      const profile: AuthUser = {
        id: authUser.id,
        name: newUser.name,
        email: normalizedEmail,
        role: newUser.role,
      };

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
      });

      if (profileError && data.session) {
        return { ok: false as const, message: mapSupabaseError(profileError) };
      }

      saveCurrentUser(profile);
      return { ok: true as const };
    }
  }

  const users = getRegisteredUsers();
  const normalizedEmail = newUser.email.trim().toLowerCase();
  const existing = users.find((user) => user.email.toLowerCase() === normalizedEmail);

  if (existing) {
    return { ok: false as const, message: "An account with this email already exists." };
  }

  const userToStore: AuthUser = {
    ...newUser,
    id: newUser.id || `user-${Date.now()}`,
    email: normalizedEmail,
  };
  saveRegisteredUsers([...users, userToStore]);
  // Persist the full profile and session so the UI sees a consistent current user
  saveCurrentUser(userToStore);
  return { ok: true as const };
}

export async function loginUser(email: string, password: string) {
  if (isSupabaseConfigured && supabase) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // If Supabase returned an error, prefer returning its message directly
    if (error) {
      // common auth status: 400/401 for invalid credentials
      if (error.status === 400 || error.status === 401) {
        return { ok: false as const, message: "Incorrect email or password. If you forgot it use 'Forgot password'." };
      }
      
      // If network error (like paused project), fallback to local storage
      if (/failed to fetch|load failed/i.test(error.message)) {
        console.warn("Supabase network error, falling back to local storage.");
      } else {
        return { ok: false as const, message: mapSupabaseError(error) };
      }
    } else {
      const authUser = data.user;
      if (!authUser) {
        return { ok: false as const, message: "Authentication failed. Please verify your credentials." };
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id,name,email,role")
        .eq("id", authUser.id)
        .single();

      saveCurrentUser({
        id: authUser.id,
        name: profileRow?.name || authUser.user_metadata?.name || normalizedEmail,
        email: profileRow?.email || normalizedEmail,
        role: profileRow?.role || authUser.user_metadata?.role || "freelancer",
      });

      return { ok: true as const };
    }
  }

  const users = getRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const match = users.find(
    (user) => user.email.toLowerCase() === normalizedEmail && user.password === password,
  );

  if (!match) {
    return { ok: false as const, message: "Invalid email or password." };
  }
  // Persist as current user so PROFILE_KEY is available and UI renders consistently
  saveCurrentUser(match);
  return { ok: true as const };
}

export function setSession(email: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, email.trim().toLowerCase());
}

export function logoutUser() {
  if (!isBrowser()) return;
  if (supabase) {
    void supabase.auth.signOut();
  }
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
  try {
    window.dispatchEvent(new CustomEvent('eruka:auth-changed', { detail: { user: null } }));
  } catch (e) {
    // ignore
  }
}

export function getCurrentUser(): AuthUser | null {
  if (!isBrowser()) return null;

  const rawProfile = window.localStorage.getItem(PROFILE_KEY);
  if (rawProfile) {
    try {
      const parsed = JSON.parse(rawProfile) as AuthUser;
      try {
        // eslint-disable-next-line no-console
        console.debug('[auth] getCurrentUser (from profile)', parsed);
      } catch {}
      return parsed;
    } catch {
      window.localStorage.removeItem(PROFILE_KEY);
    }
  }

  const currentEmail = window.localStorage.getItem(SESSION_KEY);
  if (!currentEmail) return null;

  const users = getRegisteredUsers();
  try {
    // eslint-disable-next-line no-console
    console.debug('[auth] getCurrentUser (from users list)', { currentEmail, usersLength: users.length });
  } catch {}
  return users.find((user) => user.email.toLowerCase() === currentEmail.toLowerCase()) ?? null;
}

export async function updateProfile(changes: Partial<AuthUser>) {
  if (!isBrowser()) return { ok: false as const, message: "Not running in browser." };

  const current = getCurrentUser();
  const updated: AuthUser = {
    id: (current && current.id) || changes.id || `user-${Date.now()}`,
    name: changes.name || current?.name || "",
    email: (changes.email || current?.email || "").trim().toLowerCase(),
    role: (changes.role as UserRole) || current?.role || "freelancer",
    password: changes.password || current?.password,
  };

  // persist to Supabase if available
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("profiles").upsert({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    });

    if (error) {
      return { ok: false as const, message: mapSupabaseError(error) };
    }
  }

  // save locally
  saveCurrentUser(updated);
  return { ok: true as const };
}
