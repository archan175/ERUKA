import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { fetchPostedJobs, fetchSavedBids, getAllBids, getAllJobs } from "@/lib/local-data";
import { mockBids, mockJobs, type Bid, type Job } from "@/lib/mock-data";
import { formatUsdAsInr, usdToInr } from "@/lib/currency";
import {
  Briefcase,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  ArrowUpRight,
  Activity,
  Target,
  Search,
  Bell,
  SlidersHorizontal,
  Send,
} from "lucide-react";
import { generateSmartReply } from "@/lib/reply";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { name: "Mon", earnings: 4000, spend: 2400 },
  { name: "Tue", earnings: 3000, spend: 1398 },
  { name: "Wed", earnings: 2000, spend: 9800 },
  { name: "Thu", earnings: 2780, spend: 3908 },
  { name: "Fri", earnings: 1890, spend: 4800 },
  { name: "Sat", earnings: 2390, spend: 3800 },
  { name: "Sun", earnings: 3490, spend: 4300 },
];

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ERUKA" },
      { name: "description", content: "Manage your jobs, bids, and freelance career on ERUKA." },
    ],
  }),
  beforeLoad: () => {
    if (!getCurrentUser()) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  open: "bg-success/15 text-success border-success/30",
  "in-progress": "bg-warning/15 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border",
  pending: "bg-warning/15 text-warning border-warning/30",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

function DashboardPage() {
  const currentUser = getCurrentUser();
  const [role, setRole] = useState<"freelancer" | "recruiter">(
    (currentUser?.role as "freelancer" | "recruiter") || "freelancer"
  );
  const [selectedChatId, setSelectedChatId] = useState("c1");
  const [chatInput, setChatInput] = useState("");
  const [currentUserState, setCurrentUserState] = useState<AuthUser | null>(currentUser);
  const displayName = currentUserState?.name || "Archan Patel";
  const [avatarData, setAvatarData] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("eruka_avatar");
  });
  // keep avatar and current user in sync when auth/profile updates elsewhere
  useEffect(() => {
    function onAuthChanged() {
      try {
        const next = getCurrentUser();
        setCurrentUserState(next);
        if (typeof window !== "undefined") {
          setAvatarData(window.localStorage.getItem("eruka_avatar"));
        }
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener("eruka:auth-changed", onAuthChanged);
    return () => window.removeEventListener("eruka:auth-changed", onAuthChanged);
  }, []);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>(getAllJobs());
  const [allBids, setAllBids] = useState<Bid[]>(getAllBids());
  const userKey = currentUser?.id || currentUser?.email || "u1";

  useEffect(() => {
    void fetchPostedJobs().then((postedJobs) => {
      const postedIds = new Set(postedJobs.map((job) => job.id));
      setAllJobs([...postedJobs, ...mockJobs.filter((job) => !postedIds.has(job.id))]);
    });

    void fetchSavedBids().then((savedBids) => {
      const savedIds = new Set(savedBids.map((bid) => bid.id));
      setAllBids([...savedBids, ...mockBids.filter((bid) => !savedIds.has(bid.id))]);
    });
  }, []);

  const myBids = allBids.filter(
    (b) => b.freelancerId === userKey || (!currentUser && b.freelancerId === "u1"),
  );
  const postedJobs = allJobs.filter(
    (j) => j.recruiterId === userKey || (!currentUser && j.recruiterId === "u2") || (j.recruiterName === currentUser?.name)
  );
  const activeJobs = allJobs.filter(
    (j) => j.status === "in-progress" && (role === "freelancer" ? (j.assignedFreelancerId === userKey || j.assignedFreelancerId === currentUser?.email) : (j.recruiterId === userKey || j.recruiterName === currentUser?.name)),
  );
  const completedJobs = allJobs.filter(
    (j) => j.status === "completed" && (role === "freelancer" ? (j.assignedFreelancerId === userKey || j.assignedFreelancerId === currentUser?.email) : (j.recruiterId === userKey || j.recruiterName === currentUser?.name)),
  );
  const receivedBids = allBids.filter((b) => postedJobs.some((j) => j.id === b.jobId));
  
  const bidsInReview = myBids.filter((bid) => bid.status === "pending").length;
  const totalBidValue = myBids.reduce((total, bid) => total + usdToInr(bid.amount), 0);
  const recruiterSpend = postedJobs.reduce((total, job) => total + usdToInr(job.budgetMax), 0);
  const inboxChats = [
    {
      id: "c1",
      name: "Aastha",
      username: "@aastha",
      message: "Hi Archan! I reviewed your proposal.",
      time: "2m",
      unread: 2,
    },
    {
      id: "c2",
      name: "Archan Patel",
      username: "@archanpatel",
      message: "Can you share final estimate by tonight?",
      time: "1h",
      unread: 1,
    },
    {
      id: "c3",
      name: "Zeel Patel",
      username: "@zeelpatel",
      message: "Please update milestone 2 delivery date.",
      time: "3h",
      unread: 0,
    },
    {
      id: "c4",
      name: "Aryan Patel",
      username: "@aryanpatel",
      message: "Great progress so far. Keep it up!",
      time: "Yesterday",
      unread: 0,
    },
  ];
  const [chatThreads, setChatThreads] = useState<
    Record<string, Array<{ sender: "me" | "them"; text: string; time: string }>>
  >({
    c1: [
      { sender: "them", text: "Hi Archan! I reviewed your proposal.", time: "2:10 PM" },
      { sender: "me", text: "Great, thanks. Happy to start immediately.", time: "2:12 PM" },
    ],
    c2: [
      { sender: "them", text: "Can you share final estimate by tonight?", time: "12:45 PM" },
      { sender: "me", text: "Yes, I will send a detailed estimate in an hour.", time: "12:47 PM" },
    ],
    c3: [{ sender: "them", text: "Please update milestone 2 delivery date.", time: "10:05 AM" }],
    c4: [{ sender: "them", text: "Great progress so far. Keep it up!", time: "Yesterday" }],
  });
  const CHAT_STORAGE_KEY = currentUser?.email
    ? `eruka_chats_${currentUser.email}`
    : "eruka_chats_guest";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      try {
        setChatThreads(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatThreads));
  }, [chatThreads]);
  const activeChat = inboxChats.find((chat) => chat.id === selectedChatId) || inboxChats[0];
  const activeMessages = chatThreads[selectedChatId] || [];

  // typing and reply timers for inbox chat simulation
  const [chatTyping, setChatTyping] = useState<Record<string, boolean>>({});
  const chatTimers = useRef<number[]>([]);

  // profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentUserState?.name || "");
  const [editEmail, setEditEmail] = useState(currentUserState?.email || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    return () => {
      chatTimers.current.forEach((t) => clearTimeout(t));
      chatTimers.current = [];
    };
  }, []);

  // open profile modal if URL hash indicates edit
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#edit") {
      setEditName(currentUserState?.name || "");
      setEditEmail(currentUserState?.email || "");
      setProfileOpen(true);
      // clear the hash so it doesn't reopen on navigation
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [currentUserState]);

  const handleSendMessage = () => {
    const content = chatInput.trim();
    if (!content) return;

    setChatThreads((prev) => ({
      ...prev,
      [selectedChatId]: [
        ...(prev[selectedChatId] || []),
        { sender: "me", text: content, time: "Now" },
      ],
    }));
    setChatInput("");
    // schedule an automated reply from the other participant after 8-12s
    // show typing for the selected chat
    setChatTyping((t) => ({ ...t, [selectedChatId]: true }));
    // shorter, more responsive delay
    const min = 2000;
    const max = 5000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    const timer = window.setTimeout(() => {
      // use functional updater to get latest history
      setChatThreads((prev) => {
        const history = (prev[selectedChatId] || []).map((m) => m.text);
        const reply = generateSmartReply(content, { role: currentUser?.role, history });
        const replyMessage: { sender: "me" | "them"; text: string; time: string } = {
          sender: "them",
          text: reply,
          time: "Now",
        };
        const next = { ...prev } as Record<
          string,
          { sender: "me" | "them"; text: string; time: string }[]
        >;
        next[selectedChatId] = [...(prev[selectedChatId] || []), replyMessage];
        // persist to localStorage
        if (typeof window !== "undefined")
          window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setChatTyping((t) => ({ ...t, [selectedChatId]: false }));
      chatTimers.current = chatTimers.current.filter((x) => x !== (timer as number));
    }, delay) as unknown as number;
    chatTimers.current.push(timer as number);
  };

  // Quick action handlers
  const handleQuickUpdateProfile = () => {
    setEditName(currentUserState?.name || "");
    setEditEmail(currentUserState?.email || "");
    setProfileOpen(true);
    // move focus to modal after a tiny delay
    setTimeout(() => {
      const el = document.getElementById("profile-avatar-input");
      if (el) (el as HTMLElement).focus?.();
    }, 120);
  };

  const handleQuickOpenMessages = (chatId?: string) => {
    const id = chatId || inboxChats[0]?.id || selectedChatId;
    if (!id) return;
    setSelectedChatId(id);
    // ensure messages container and input are focused/visible
    setTimeout(() => {
      const container = document.getElementById("dashboard-messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      const inputEl = document.getElementById("dashboard-chat-input") as HTMLInputElement | null;
      inputEl?.focus?.();
    }, 150);
  };

  const handleQuickReviewOpportunities = () => {
    window.location.href = "/jobs";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {avatarData ? (
              <img
                src={avatarData}
                alt={`${displayName} avatar`}
                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-black text-primary">
                {displayName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-primary">Workspace overview</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Welcome, {displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep proposals, projects, messages, and next actions moving.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border/70 bg-background p-1">
              <Button
                size="sm"
                variant={role === "freelancer" ? "default" : "ghost"}
                onClick={() => setRole("freelancer")}
              >
                Freelancer
              </Button>
              <Button
                size="sm"
                variant={role === "recruiter" ? "default" : "ghost"}
                onClick={() => setRole("recruiter")}
              >
                Recruiter
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleQuickUpdateProfile}>
              Edit profile
            </Button>
            {role === "freelancer" ? (
              <Link to="/jobs">
                <Button size="sm" variant="hero">
                  Browse jobs <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link to="/post-job">
                <Button size="sm" variant="hero">
                  Post a job <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {profileOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setProfileOpen(false)}
            aria-label="Close profile editor"
          />
          <Card className="relative w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                Keep your contact information and profile image current.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Display name</label>
                <Input
                  className="mt-2"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Email</label>
                <Input
                  className="mt-2"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Avatar</label>
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/70 p-3">
                  {avatarData ? (
                    <img
                      src={avatarData}
                      className="h-12 w-12 rounded-xl object-cover"
                      alt="Avatar preview"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10" />
                  )}
                  <input
                    ref={profileAvatarInputRef}
                    id="profile-avatar-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 3 * 1024 * 1024) {
                        toast.error("Choose an image smaller than 3 MB");
                        return;
                      }
                      setUploadingAvatar(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base = String(reader.result || "");
                        window.localStorage.setItem("eruka_avatar", base);
                        setAvatarData(base);
                        setUploadingAvatar(false);
                        toast.success("Avatar updated");
                      };
                      reader.onerror = () => {
                        setUploadingAvatar(false);
                        toast.error("Could not read that image");
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingAvatar}
                    onClick={() => profileAvatarInputRef.current?.click()}
                  >
                    {uploadingAvatar ? "Uploading…" : "Choose image"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button variant="ghost" onClick={() => setProfileOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!editName.trim() || !editEmail.trim()) {
                      toast.error("Name and email are required");
                      return;
                    }
                    const { updateProfile } = await import("@/lib/auth");
                    const result = await updateProfile({
                      name: editName.trim(),
                      email: editEmail.trim(),
                    });
                    if (!result.ok) {
                      toast.error(result.message || "Could not update profile");
                      return;
                    }
                    setCurrentUserState((previous) =>
                      previous
                        ? { ...previous, name: editName.trim(), email: editEmail.trim() }
                        : previous,
                    );
                    toast.success("Profile updated");
                    setProfileOpen(false);
                  }}
                >
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {role === "freelancer" ? (
          <>
            <StatCard
              icon={FileText}
              label="My proposals"
              value={myBids.length.toString()}
              note={`${bidsInReview} awaiting review`}
            />
            <StatCard
              icon={Briefcase}
              label="Active projects"
              value={activeJobs.length.toString()}
              note="Work currently underway"
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={completedJobs.length.toString()}
              note="Lifetime deliveries"
            />
            <StatCard
              icon={TrendingUp}
              label="Pipeline value"
              value={formatInrCompact(totalBidValue)}
              note="Across submitted bids"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Briefcase}
              label="Posted jobs"
              value={postedJobs.length.toString()}
              note="All available records"
            />
            <StatCard
              icon={Users}
              label="Received bids"
              value={receivedBids.length.toString()}
              note="Across your pipeline"
            />
            <StatCard
              icon={TrendingUp}
              label="In progress"
              value={activeJobs.length.toString()}
              note="Current engagements"
            />
            <StatCard
              icon={Target}
              label="Budget pipeline"
              value={formatInrCompact(recruiterSpend)}
              note="Maximum planned spend"
            />
          </>
        )}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="gradient-card border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{role === "freelancer" ? "Earnings Activity" : "Spend Overview"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", border: "none", borderRadius: "8px", color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area type="monotone" dataKey={role === "freelancer" ? "earnings" : "spend"} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 mt-6 pt-4 border-t border-border/50">
              <MiniMetric title="Avg. Reply Time" value="35 min" icon={Clock} />
              <MiniMetric title="Success Score" value="98%" icon={Target} />
              <MiniMetric title="Weekly Activity" value="+14%" icon={Activity} />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleQuickUpdateProfile()}
            >
              Update Profile
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleQuickOpenMessages()}
            >
              Open Messages
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => handleQuickReviewOpportunities()}
            >
              Review Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(chatThreads.c1 || [])
              .slice(-3)
              .reverse()
              .map((message, index) => (
                <div
                  key={`activity-${index}`}
                  className="flex items-start gap-3 rounded-xl bg-muted/35 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                    {message.sender === "me" ? "ME" : "AS"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{message.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{message.time}</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent opportunities</CardTitle>
            <Link to="/jobs" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {allJobs.slice(0, 4).map((job) => (
              <Link
                key={job.id}
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="flex items-center justify-between gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{job.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.category} · {formatUsdAsInr(job.budgetMax)}
                  </p>
                </div>
                <Badge variant="secondary">{job.bidsCount} bids</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {role === "freelancer" ? (
            <Tabs defaultValue="bids" className="space-y-6">
              <TabsList className="bg-card border border-border/50">
                <TabsTrigger value="bids">My Bids</TabsTrigger>
                <TabsTrigger value="active">Active Jobs</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="bids">
                <div className="space-y-3">
                  {myBids.length > 0 ? (
                    myBids.map((bid) => {
                      const job = allJobs.find((j) => j.id === bid.jobId);
                      return (
                        <Link key={bid.id} to="/jobs/$jobId" params={{ jobId: bid.jobId }}>
                          <Card className="gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                            <CardContent className="p-5 flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-foreground">{job?.title}</h3>
                                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    ₹{formatUsdAsInr(bid.amount)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {bid.deliveryTime} days
                                  </span>
                                </div>
                              </div>
                              <Badge className={statusStyles[bid.status]}>{bid.status}</Badge>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })
                  ) : (
                    <Card className="gradient-card border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No proposals submitted yet. Browse jobs to place a bid!
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="active">
                <div className="space-y-3">
                  {activeJobs.length > 0 ? (
                    activeJobs.map((job) => (
                      <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                        <Card className="gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{job.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                by {job.recruiterName}
                              </p>
                            </div>
                            <Badge className={statusStyles[job.status]}>
                              {job.status.replace("-", " ")}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <Card className="gradient-card border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No active jobs yet.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="space-y-3">
                  {completedJobs.length > 0 ? (
                    completedJobs.map((job) => (
                      <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                        <Card className="gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{job.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                by {job.recruiterName}
                              </p>
                            </div>
                            <Badge className={statusStyles[job.status]}>
                              {job.status.replace("-", " ")}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <Card className="gradient-card border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        You have not completed any jobs yet. Keep up the great work!
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="posted" className="space-y-6">
              <TabsList className="bg-card border border-border/50">
                <TabsTrigger value="posted">Posted Jobs</TabsTrigger>
                <TabsTrigger value="bids">Received Bids</TabsTrigger>
              </TabsList>

              <TabsContent value="posted">
                <div className="space-y-3">
                  {postedJobs.length > 0 ? (
                    postedJobs.map((job) => (
                      <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                        <Card className="gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{job.title}</h3>
                              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{job.bidsCount} bids</span>
                                <span>
                                  {formatUsdAsInr(job.budgetMin)} – {formatUsdAsInr(job.budgetMax)}
                                </span>
                              </div>
                            </div>
                            <Badge className={statusStyles[job.status]}>
                              {job.status.replace("-", " ")}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  ) : (
                    <Card className="gradient-card border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        You haven't posted any jobs yet. <Link to="/post-job" className="text-primary hover:underline">Post a job</Link> to get started.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="bids">
                <div className="space-y-3">
                  {receivedBids.length > 0 ? (
                    receivedBids.map((bid) => {
                      const job = allJobs.find((j) => j.id === bid.jobId);
                      return (
                        <Link key={bid.id} to="/jobs/$jobId" params={{ jobId: bid.jobId }}>
                          <Card className="gradient-card border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                            <CardContent className="p-5 flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-foreground">{bid.freelancerName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  on {job?.title} · {formatUsdAsInr(bid.amount)} · {bid.deliveryTime}{" "}
                                  days
                                </p>
                              </div>
                              <Badge className={statusStyles[bid.status]}>{bid.status}</Badge>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })
                  ) : (
                    <Card className="gradient-card border-border/50">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No received bids yet. Bids will appear here when freelancers apply to your jobs.
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Card className="gradient-card border-border/50 h-fit xl:sticky xl:top-20">
          <CardHeader className="border-b border-border/50 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Messages</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    import("sonner").then((m) => m.toast("No new notifications"));
                  }}
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    import("sonner").then((m) => m.toast("Filter options coming soon!"));
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search chats..." className="h-9 pl-9 bg-input/50" />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto border-b border-border/50 pb-2">
              {inboxChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full rounded-lg p-2.5 text-left transition-colors hover:bg-accent/40 ${
                    selectedChatId === chat.id ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                      {chat.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{chat.name}</p>
                        <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{chat.username}</p>
                      <p className="truncate text-xs text-foreground/90">{chat.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {chatTyping[chat.id] && (
                        <div className="text-[11px] text-muted-foreground">typing…</div>
                      )}
                      {chat.unread > 0 && (
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-border/50 bg-card/30">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-sm font-semibold">{activeChat.name}</p>
                <p className="text-[11px] text-muted-foreground">{activeChat.username}</p>
              </div>
              <div
                id="dashboard-messages-container"
                className="max-h-56 space-y-2 overflow-y-auto p-3"
              >
                {activeMessages.map((message, index) => (
                  <div
                    key={`${selectedChatId}-${index}`}
                    className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-2.5 py-2 text-xs ${
                        message.sender === "me"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p>{message.text}</p>
                      <p
                        className={`mt-1 text-[10px] ${message.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
                {chatTyping[selectedChatId] && (
                  <div className="flex justify-start">
                    <div className="max-w-[60%] rounded-lg px-3 py-2 text-xs bg-muted text-foreground">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-75" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-150" />
                        <div className="ml-2 text-[11px] text-muted-foreground">typing...</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <form
                className="flex gap-2 border-t border-border/50 p-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSendMessage();
                }}
              >
                <Input
                  id="dashboard-chat-input"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Type message..."
                  className="h-8 bg-input/50 text-xs"
                />
                <Button type="submit" size="icon" className="h-8 w-8" disabled={!chatInput.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="gradient-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground/80">{note}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{title}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatInrCompact(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
