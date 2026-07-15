import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, Briefcase, List as Menu, ChatCircleDots, X, Sun, Moon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import { useEffect } from "react";
import { toast } from "sonner";
import { fetchUnreadMessages, subscribeToMessages, type ChatMessage } from "@/lib/chat";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Browse Jobs" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setTick] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [unreadMessages, setUnreadMessages] = useState<ChatMessage[]>([]);

  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("theme", "light");
    }
  };

  const unreadCount = unreadMessages.length;
  const unreadLabel = unreadCount > 9 ? "9+" : unreadCount.toString();

  const handleNotificationsClick = () => {
    if (unreadCount === 0) {
      toast.info("No new notifications");
      return;
    }

    toast.info(`${unreadCount} new message${unreadCount === 1 ? "" : "s"}`);
    void navigate({ to: "/chat" });
  };

  useEffect(() => {
    function onAuth() {
      // force re-render to pick up updated getCurrentUser()
      setTick((t) => t + 1);
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("eruka:auth-changed", onAuth);
    window.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("eruka:auth-changed", onAuth);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnreadMessages([]);
      return;
    }

    let active = true;
    const refreshUnread = () => {
      void fetchUnreadMessages().then((messages) => {
        if (active) setUnreadMessages(messages);
      });
    };

    refreshUnread();

    const unsubscribe = subscribeToMessages((message) => {
      const latestUser = getCurrentUser();
      refreshUnread();

      if (!latestUser || message.sender_id === latestUser.id || location.pathname === "/chat") {
        return;
      }

      toast.info(`New message from ${message.sender?.name || "ERUKA"}`);
    });

    window.addEventListener("eruka:chat-seen", refreshUnread);
    window.addEventListener("eruka:auth-changed", refreshUnread);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("eruka:chat-seen", refreshUnread);
      window.removeEventListener("eruka:auth-changed", refreshUnread);
    };
  }, [currentUser?.id, location.pathname]);

  return (
    <header
      className={`sticky top-3 z-[90] w-full max-w-7xl mx-auto rounded-2xl border transition-all duration-300 ${
        scrolled
          ? "border-border/80 bg-background/88 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl"
          : "border-transparent bg-background/55 backdrop-blur-md"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Section - Logo */}
        <div className="flex flex-1 items-center justify-start">
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md transition-transform group-hover:-rotate-3 group-hover:scale-105">
              <Briefcase weight="fill" className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-lg font-black leading-none tracking-tight text-foreground">
                ERUKA
              </span>
              <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
                Work without borders
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section - Navigation */}
        <div className="flex items-center justify-center shrink-0">
          <nav className="hidden items-center gap-1 rounded-xl border border-border/60 bg-card/70 p-1 md:flex shadow-sm">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={location.pathname === link.to ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={currentUser ? "/post-job" : "/login"}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === "/post-job"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Post Job
            </Link>
          </nav>
        </div>

        {/* Right Section - Actions */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun weight="fill" className="h-4 w-4" />
              ) : (
                <Moon weight="fill" className="h-4 w-4" />
              )}
            </button>
            {currentUser ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                  onClick={handleNotificationsClick}
                >
                  <Bell weight="fill" className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                      {unreadLabel}
                    </span>
                  )}
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={`relative h-9 w-9 ${
                    location.pathname === "/chat"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link to="/chat" aria-label="Messages">
                    <ChatCircleDots weight="fill" className="h-4 w-4" />
                  </Link>
                </Button>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <span className="max-w-28 truncate">{currentUser.name}</span>
                  </Button>
                </Link>
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => {
                    logoutUser();
                    void navigate({ to: "/" });
                  }}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleDark}
              className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun weight="fill" className="h-5 w-5" />
              ) : (
                <Moon weight="fill" className="h-5 w-5" />
              )}
            </button>
            {currentUser && (
              <>
                <button
                  type="button"
                  className="relative rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                  onClick={handleNotificationsClick}
                >
                  <Bell weight="fill" className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
                      {unreadLabel}
                    </span>
                  )}
                </button>
                <Link
                  to="/chat"
                  className={`rounded-lg p-2.5 transition-colors ${
                    location.pathname === "/chat"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-label="Messages"
                >
                  <ChatCircleDots weight="fill" className="h-5 w-5" />
                </Link>
              </>
            )}
            <button
              className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X weight="bold" className="h-5 w-5" />
              ) : (
                <Menu weight="bold" className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 px-3 py-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={currentUser ? "/post-job" : "/login"}
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                location.pathname === "/post-job"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Post Job
            </Link>
            {currentUser ? (
              <div className="mt-2 flex gap-2">
                <Link to="/profile" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    {currentUser.name}
                  </Button>
                </Link>
                <Button
                  variant="hero"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setMobileOpen(false);
                    logoutUser();
                    void navigate({ to: "/" });
                  }}
                >
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button variant="hero" size="sm" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
