import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { fetchPostedJobs, fetchSavedBids, getAllBids, getAllJobs } from "@/lib/local-data";
import { mockBids, mockJobs, type Bid, type Job } from "@/lib/mock-data";
import { formatUsdAsInr, usdToInr } from "@/lib/currency";
import {
  Briefcase,
  FileText,
  CheckCircle,
  TrendUp,
  Users,
  Target,
  Clock,
  ShieldCheck,
  Star,
  Pulse,
} from "@phosphor-icons/react";

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
  open: "bg-primary/10 text-primary border-primary/30",
  "in-progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  completed: "bg-muted/50 text-foreground border-primary/20",
  pending: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  accepted: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-red-500/10 text-red-500 border-red-500/30",
};

function formatInrCompact(num: number) {
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: any;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="bg-card border-border hover:border-border transition-colors shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
            <Icon weight="fill" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {label}
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-foreground">{value}</h3>
          </div>
        </div>
        <p className="mt-4 text-xs font-medium text-muted-foreground/60">{note}</p>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const currentUser = getCurrentUser();
  const [role, setRole] = useState<"freelancer" | "recruiter">(
    (currentUser?.role as "freelancer" | "recruiter") || "freelancer",
  );

  const [currentUserState, setCurrentUserState] = useState<AuthUser | null>(currentUser);
  const activeUser = currentUserState;
  const displayName = activeUser?.name || "Node User";

  const [avatarData, setAvatarData] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("eruka_avatar");
  });

  useEffect(() => {
    function onAuthChanged() {
      try {
        const next = getCurrentUser();
        setCurrentUserState(next);
        if (next?.role) setRole(next.role);
        if (typeof window !== "undefined") {
          setAvatarData(window.localStorage.getItem("eruka_avatar"));
        }
      } catch (err) {}
    }
    window.addEventListener("eruka:auth-changed", onAuthChanged);
    return () => window.removeEventListener("eruka:auth-changed", onAuthChanged);
  }, []);

  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>(getAllJobs());
  const [allBids, setAllBids] = useState<Bid[]>(getAllBids());

  const userKeys = useMemo(
    () => new Set([activeUser?.id, activeUser?.email].filter((key): key is string => Boolean(key))),
    [activeUser?.id, activeUser?.email],
  );
  const belongsToActiveUser = (value?: string) => Boolean(value && userKeys.has(value));

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

  const myBids = allBids.filter((b) => belongsToActiveUser(b.freelancerId));
  const postedJobs = allJobs.filter((j) => belongsToActiveUser(j.recruiterId));
  const activeJobs = allJobs.filter(
    (j) =>
      j.status === "in-progress" &&
      (role === "freelancer"
        ? belongsToActiveUser(j.assignedFreelancerId)
        : belongsToActiveUser(j.recruiterId)),
  );
  const completedJobs = allJobs.filter(
    (j) =>
      j.status === "completed" &&
      (role === "freelancer"
        ? belongsToActiveUser(j.assignedFreelancerId)
        : belongsToActiveUser(j.recruiterId)),
  );

  const totalBidValue = myBids.reduce((total, bid) => total + usdToInr(bid.amount), 0);
  const recruiterSpend = postedJobs.reduce((total, job) => total + usdToInr(job.budgetMax), 0);
  const successScore = completedJobs.length > 0 ? 100 : activeJobs.length > 0 ? 85 : 0;

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentUserState?.name || "");
  const [editEmail, setEditEmail] = useState(currentUserState?.email || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Clean Profile Header */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => setProfileOpen(true)}>
            {avatarData ? (
              <img
                src={avatarData}
                alt="avatar"
                className="h-20 w-20 rounded-2xl object-cover border-2 border-border"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted text-2xl font-bold text-foreground border-2 border-border">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] font-bold uppercase text-white">Edit</span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full border-4 border-background">
              <ShieldCheck weight="fill" className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-1">
              {displayName}
            </h1>
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star weight="fill" className="h-3.5 w-3.5 text-yellow-500" /> Top Rated Node
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Pulse weight="fill" className="h-3.5 w-3.5 text-primary" /> 100% Success
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-muted p-1.5 rounded-xl border border-border">
          <button
            onClick={() => setRole("freelancer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              role === "freelancer"
                ? "bg-muted/50 text-foreground shadow-md"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            Freelancer
          </button>
          <button
            onClick={() => setRole("recruiter")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              role === "recruiter"
                ? "bg-muted/50 text-foreground shadow-md"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            Recruiter
          </button>
        </div>
      </section>

      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50 animate-in fade-in">
          <Card className="relative w-full max-w-md bg-muted border-border shadow-2xl">
            <CardHeader>
              <CardTitle className="text-foreground">Profile Settings</CardTitle>
              <p className="text-xs text-muted-foreground">Update your node identity.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Display Name
                </label>
                <Input
                  className="mt-1.5 bg-background border-border text-foreground"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Email Address
                </label>
                <Input
                  className="mt-1.5 bg-background border-border text-foreground"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Avatar
                </label>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  {avatarData ? (
                    <img
                      src={avatarData}
                      className="h-10 w-10 rounded-lg object-cover"
                      alt="Avatar preview"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                  )}
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploadingAvatar(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base = String(reader.result || "");
                        window.localStorage.setItem("eruka_avatar", base);
                        setAvatarData(base);
                        setUploadingAvatar(false);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-muted/50 text-foreground hover:bg-white/20 text-xs"
                    onClick={() => profileAvatarInputRef.current?.click()}
                  >
                    {uploadingAvatar ? "Uploading…" : "Change Avatar"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="text-foreground hover:bg-muted/50"
                  onClick={() => setProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                  onClick={async () => {
                    if (!editName.trim() || !editEmail.trim())
                      return toast.error("Required fields missing");
                    const { updateProfile } = await import("@/lib/auth");
                    await updateProfile({ name: editName.trim(), email: editEmail.trim() });
                    setCurrentUserState((prev) =>
                      prev ? { ...prev, name: editName.trim(), email: editEmail.trim() } : prev,
                    );
                    toast.success("Identity synchronized");
                    setProfileOpen(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Core Metrics */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {role === "freelancer" ? (
          <>
            <StatCard
              icon={FileText}
              label="Active Proposals"
              value={myBids.length.toString()}
              note="Submitted to clients"
            />
            <StatCard
              icon={Briefcase}
              label="Current Jobs"
              value={activeJobs.length.toString()}
              note="Work in progress"
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={completedJobs.length.toString()}
              note="Successfully delivered"
            />
            <StatCard
              icon={TrendUp}
              label="Total Earnings"
              value={formatInrCompact(totalBidValue)}
              note="Lifetime value"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Briefcase}
              label="Posted Jobs"
              value={postedJobs.length.toString()}
              note="Total listings"
            />
            <StatCard
              icon={Users}
              label="Total Candidates"
              value={allBids
                .filter((b) => postedJobs.some((j) => j.id === b.jobId))
                .length.toString()}
              note="Across all jobs"
            />
            <StatCard
              icon={Target}
              label="Active Contracts"
              value={activeJobs.length.toString()}
              note="Currently underway"
            />
            <StatCard
              icon={TrendUp}
              label="Total Spent"
              value={formatInrCompact(recruiterSpend)}
              note="Lifetime expenditure"
            />
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (Feed) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xl font-bold text-foreground">
              {role === "freelancer" ? "Recommended For You" : "Your Postings"}
            </h2>
            {role === "recruiter" && (
              <Link to="/post-job">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-9">
                  Post New Job
                </Button>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {(role === "freelancer" ? allJobs : postedJobs).slice(0, 5).map((job) => (
              <Link key={job.id} to="/jobs/$jobId" params={{ jobId: job.id }}>
                <Card className="bg-muted border-border hover:border-primary/30 transition-all cursor-pointer group shadow-md">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <Badge className={statusStyles[job.status] || "bg-muted/50"}>
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/60 line-clamp-2 mb-4">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground/60">
                      <span className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border">
                        <Target weight="fill" className="h-3.5 w-3.5 text-primary" /> {job.category}
                      </span>
                      <span className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border">
                        <TrendUp weight="bold" className="h-3.5 w-3.5 text-blue-400" /> ₹
                        {formatUsdAsInr(job.budgetMax)} Budget
                      </span>
                      <span className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border">
                        <Clock weight="fill" className="h-3.5 w-3.5 text-yellow-500" />{" "}
                        {job.deadline} deadline
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(role === "freelancer" ? allJobs : postedJobs).length === 0 && (
              <div className="p-8 text-center text-muted-foreground/60 border border-border border-dashed rounded-xl">
                No jobs found. {role === "recruiter" && "Post your first job to get started!"}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          <Card className="bg-muted border-border shadow-md">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg text-foreground">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  <span>Job Success</span>
                  <span className="text-primary">{successScore}%</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div className="h-full bg-primary" style={{ width: `${successScore}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {role === "freelancer" && (
            <Card className="bg-muted border-border shadow-md">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg text-foreground">Recent Proposals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {myBids.slice(0, 3).map((bid) => {
                    const job = allJobs.find((j) => j.id === bid.jobId);
                    return (
                      <Link
                        key={bid.id}
                        to="/jobs/$jobId"
                        params={{ jobId: bid.jobId }}
                        className="block p-4 hover:bg-muted transition-colors"
                      >
                        <p className="font-semibold text-sm text-foreground truncate">
                          {job?.title || "Unknown Job"}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-primary font-bold">
                            ₹{formatUsdAsInr(bid.amount)}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${statusStyles[bid.status] || "bg-muted/50"}`}
                          >
                            {bid.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  {myBids.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground/60">
                      You haven't submitted any proposals yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
