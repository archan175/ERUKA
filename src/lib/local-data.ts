import { type Bid, type Job } from "@/lib/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getCurrentDataUser } from "@/lib/auth";

const JOBS_KEY = "eruka_posted_jobs";
const BIDS_KEY = "eruka_bids";
const MESSAGES_KEY = "eruka_messages";

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function mergeById<T extends { id: string }>(preferred: T[], fallback: T[]) {
  const preferredIds = new Set(preferred.map((item) => item.id));
  return [...preferred, ...fallback.filter((item) => !preferredIds.has(item.id))];
}

function notifyLocalDataChanged(type: "jobs" | "bids", detail: unknown) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(`eruka:${type}-changed`, { detail }));
}

function initialsForName(name: string) {
  return (name || "EU")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mapJobRow(job: any): Job {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    budgetMin: job.budget_min,
    budgetMax: job.budget_max,
    skills: job.skills || [],
    deadline: job.deadline,
    status: job.status,
    recruiterId: job.recruiter_id,
    recruiterName: job.recruiter_name,
    assignedFreelancerId: job.assigned_freelancer_id || undefined,
    createdAt: job.created_at?.slice(0, 10) || "",
    bidsCount: job.bids_count || 0,
    category: job.category,
  };
}

function mapBidRow(bid: any): Bid {
  return {
    id: bid.id,
    jobId: bid.job_id,
    freelancerId: bid.freelancer_id,
    freelancerName: bid.freelancer_name,
    freelancerRating: bid.freelancer_rating,
    freelancerAvatar: bid.freelancer_avatar,
    amount: bid.amount,
    proposal: bid.proposal,
    deliveryTime: bid.delivery_time,
    status: bid.status,
    createdAt: bid.created_at?.slice(0, 10) || "",
  };
}

function toJobRecord(job: Job) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    budget_min: job.budgetMin,
    budget_max: job.budgetMax,
    skills: job.skills,
    deadline: job.deadline,
    status: job.status,
    recruiter_id: job.recruiterId,
    recruiter_name: job.recruiterName,
    assigned_freelancer_id: job.assignedFreelancerId || null,
    bids_count: job.bidsCount,
    category: job.category,
  };
}

function toBidRecord(bid: Bid) {
  return {
    id: bid.id,
    job_id: bid.jobId,
    freelancer_id: bid.freelancerId,
    freelancer_name: bid.freelancerName,
    freelancer_rating: bid.freelancerRating,
    freelancer_avatar: bid.freelancerAvatar,
    amount: bid.amount,
    proposal: bid.proposal,
    delivery_time: bid.deliveryTime,
    status: bid.status,
  };
}

function persistLocalJob(job: Job) {
  const existing = getPostedJobs();
  writeJson(JOBS_KEY, [job, ...existing.filter((item) => item.id !== job.id)]);
  notifyLocalDataChanged("jobs", { job });
}

function persistLocalBid(bid: Bid) {
  const existing = getSavedBids();
  writeJson(BIDS_KEY, [bid, ...existing.filter((item) => item.id !== bid.id)]);
  syncLocalJobBidCount(bid.jobId);
  notifyLocalDataChanged("bids", { bid });
}

function syncLocalJobBidCount(jobId: string) {
  const jobs = getPostedJobs();
  if (!jobs.some((job) => job.id === jobId)) return;

  const bidCount = getSavedBids().filter((bid) => bid.jobId === jobId).length;
  writeJson(
    JOBS_KEY,
    jobs.map((job) => (job.id === jobId ? { ...job, bidsCount: bidCount } : job)),
  );
}

export function getPostedJobs(): Job[] {
  return readJson<Job[]>(JOBS_KEY, []);
}

export async function fetchPostedJobs(): Promise<Job[]> {
  const localJobs = getPostedJobs();
  if (!isSupabaseConfigured || !supabase) return localJobs;

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPostedJobs] Supabase error, using local fallback:", error.message, error.details);
    return localJobs;
  }
  if (!data) return localJobs;

  const remoteJobs = data.map(mapJobRow);
  // Always merge: remote is preferred, but keep local entries not in remote (e.g. draft)
  return mergeById(remoteJobs, localJobs);
}

export function subscribeToJobs(callback: (job: Job) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel("public:jobs")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "jobs" },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          callback(mapJobRow(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export async function savePostedJob(job: Job): Promise<Job> {
  let jobToSave = job;

  if (isSupabaseConfigured && supabase) {
    // Always use the Supabase auth session user directly so the UUID matches auth.uid() in RLS
    const { data: sessionData } = await supabase.auth.getUser();
    const authUser = sessionData?.user;

    if (authUser) {
      const localUser = await getCurrentDataUser();
      jobToSave = {
        ...job,
        // Use auth UUID as recruiter_id (this is what RLS checks against auth.uid())
        recruiterId: authUser.id,
        recruiterName: job.recruiterName || localUser?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "ERUKA User",
      };

      const record = toJobRecord(jobToSave);
      const { error } = await supabase
        .from("jobs")
        .upsert(record, { onConflict: "id" });

      if (!error) {
        persistLocalJob(jobToSave);
        // Notify other tabs
        if (isBrowser()) {
          window.dispatchEvent(new CustomEvent("eruka:jobs-changed", { detail: { job: jobToSave } }));
        }
        return jobToSave;
      }

      console.error("[savePostedJob] Supabase upsert failed:", error.message, error.details);
      // Throw so the caller (post-job form) can show a proper error toast
      throw new Error(error.message || "Failed to publish job to database. Please try again.");
    } else {
      // Not authenticated with Supabase — save locally only
      console.warn("[savePostedJob] No Supabase session, saving locally only.");
    }
  }

  persistLocalJob(jobToSave);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("eruka:jobs-changed", { detail: { job: jobToSave } }));
  }
  return jobToSave;
}

export function getAllJobs(): Job[] {
  return getPostedJobs();
}

export function getSavedBids(): Bid[] {
  return readJson<Bid[]>(BIDS_KEY, []);
}

export async function fetchSavedBids(): Promise<Bid[]> {
  const localBids = getSavedBids();
  if (!isSupabaseConfigured || !supabase) return localBids;

  const { data, error } = await supabase
    .from("bids")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return localBids;

  const remoteBids = data.map(mapBidRow);
  return mergeById(remoteBids, localBids);
}

async function persistBid(bid: Bid): Promise<Bid> {
  let bidToSave = bid;

  if (isSupabaseConfigured && supabase) {
    // Use the Supabase auth session directly so UUID matches auth.uid() in RLS
    const { data: sessionData } = await supabase.auth.getUser();
    const authUser = sessionData?.user;

    if (authUser && bid.status === "pending") {
      const localUser = await getCurrentDataUser();
      bidToSave = {
        ...bid,
        freelancerId: authUser.id,
        freelancerName: bid.freelancerName || localUser?.name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "ERUKA User",
        freelancerAvatar: bid.freelancerAvatar || initialsForName(bid.freelancerName || localUser?.name || "EU"),
      };
    } else if (!authUser && bid.status === "pending") {
      // Not signed in to Supabase - use local data
      const activeUser = await getCurrentDataUser();
      if (activeUser) {
        bidToSave = {
          ...bid,
          freelancerId: activeUser.id,
          freelancerName: bid.freelancerName || activeUser.name,
          freelancerAvatar: bid.freelancerAvatar || initialsForName(activeUser.name),
        };
      }
    }

    const { error } = await supabase
      .from("bids")
      .upsert(toBidRecord(bidToSave), { onConflict: "id" });

    if (!error) {
      persistLocalBid(bidToSave);
      if (isBrowser()) {
        window.dispatchEvent(new CustomEvent("eruka:bid-updated", { detail: bidToSave }));
      }
      return bidToSave;
    }

    console.error("[persistBid] Supabase upsert failed:", error.message, error.details);
    throw new Error(error.message || "Failed to submit proposal to database.");
  }

  persistLocalBid(bidToSave);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("eruka:bid-updated", { detail: bidToSave }));
  }
  return bidToSave;
}

export async function saveBid(bid: Bid): Promise<Bid> {
  return persistBid(bid);
}

export function getSavedMessages() {
  return readJson<any[]>(MESSAGES_KEY, []);
}

export async function fetchMessagesForUser(userId: string) {
  if (!isSupabaseConfigured || !supabase)
    return getSavedMessages().filter((m) => m.senderId === userId || m.receiverId === userId);

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });
  if (error || !data)
    return getSavedMessages().filter((m) => m.senderId === userId || m.receiverId === userId);
  return data.map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    text: m.message,
    createdAt: m.created_at,
  }));
}

export async function saveMessage(msg: {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt?: string;
}) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("messages").insert({
        id: msg.id,
        sender_id: msg.senderId,
        receiver_id: msg.receiverId,
        message: msg.text,
      });
      return;
    } catch {}
  }

  // local fallback
  writeJson(MESSAGES_KEY, [
    {
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      text: msg.text,
      createdAt: msg.createdAt || new Date().toISOString(),
    },
    ...getSavedMessages(),
  ]);
}

export async function upsertBid(bid: Bid): Promise<Bid> {
  return persistBid(bid);
}

export function subscribeToBids(jobId: string, callback: (bid: Bid) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel(`public:bids:${jobId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bids", filter: `job_id=eq.${jobId}` },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          callback(mapBidRow(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

export function getAllBids(): Bid[] {
  return getSavedBids();
}

export function getLowestStoredBid(jobId: string): number | null {
  const jobBids = getAllBids().filter((b) => b.jobId === jobId);
  if (jobBids.length === 0) return null;
  return Math.min(...jobBids.map((bid) => bid.amount));
}
