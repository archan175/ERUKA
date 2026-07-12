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
  TrendingUp,
  Users,
  Target,
  Clock,
  ShieldCheck,
  Star,
  Activity
} from "lucide-react";

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
  completed: "bg-white/10 text-white border-white/20",
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

function StatCard({ icon: Icon, label, value, note }: { icon: any; label: string; value: string; note: string }) {
  return (
    <Card className="bg-[#07111f] border-white/5 hover:border-white/10 transition-colors shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">{label}</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-white">{value}</h3>
          </div>
        </div>
        <p className="mt-4 text-xs font-medium text-white/40">{note}</p>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const currentUser = getCurrentUser();
  const [role, setRole] = useState<"freelancer" | "recruiter">(
    (currentUser?.role as "freelancer" | "recruiter") || "freelancer"
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
    (j) => j.status === "in-progress" && (role === "freelancer" ? belongsToActiveUser(j.assignedFreelancerId) : belongsToActiveUser(j.recruiterId)),
  );
  const completedJobs = allJobs.filter(
    (j) => j.status === "completed" && (role === "freelancer" ? belongsToActiveUser(j.assignedFreelancerId) : belongsToActiveUser(j.recruiterId)),
  );
  
  const totalBidValue = myBids.reduce((total, bid) => total + usdToInr(bid.amount), 0);
  const recruiterSpend = postedJobs.reduce((total, job) => total + usdToInr(job.budgetMax), 0);
  const successScore = completedJobs.length > 0 ? 100 : (activeJobs.length > 0 ? 85 : 0);

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState(currentUserState?.name || "");
  const [editEmail, setEditEmail] = useState(currentUserState?.email || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      
      {/* Clean Profile Header */}
      <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={() => setProfileOpen(true)}>
            {avatarData ? (
              <img src={avatarData} alt="avatar" className="h-20 w-20 rounded-2xl object-cover border-2 border-white/10" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 text-2xl font-bold text-white border-2 border-white/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-[10px] font-bold uppercase text-white">Edit</span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-full border-4 border-[#050b18]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">{displayName}</h1>
            <div className="flex items-center gap-4 text-xs font-medium text-white/50">
              <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-500" /> Top Rated Node</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> 100% Success</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0b1528] p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => setRole("freelancer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              role === "freelancer" ? "bg-white/10 text-white shadow-md" : "text-white/40 hover:text-white"
            }`}
          >
            Freelancer
          </button>
          <button
            onClick={() => setRole("recruiter")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              role === "recruiter" ? "bg-white/10 text-white shadow-md" : "text-white/40 hover:text-white"
            }`}
          >
            Recruiter
          </button>
        </div>
      </section>

      {profileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50 animate-in fade-in">
          <Card className="relative w-full max-w-md bg-[#0b1528] border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Profile Settings</CardTitle>
              <p className="text-xs text-white/50">Update your node identity.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Display Name</label>
                <Input className="mt-1.5 bg-[#050b18] border-white/10 text-white" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Email Address</label>
                <Input className="mt-1.5 bg-[#050b18] border-white/10 text-white" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Avatar</label>
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-white/10 bg-[#050b18] p-3">
                  {avatarData ? (
                    <img src={avatarData} className="h-10 w-10 rounded-lg object-cover" alt="Avatar preview" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white/5" />
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
                  <Button size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20 text-xs" onClick={() => profileAvatarInputRef.current?.click()}>
                    {uploadingAvatar ? "Uploading…" : "Change Avatar"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setProfileOpen(false)}>Cancel</Button>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold" onClick={async () => {
                  if (!editName.trim() || !editEmail.trim()) return toast.error("Required fields missing");
                  const { updateProfile } = await import("@/lib/auth");
                  await updateProfile({ name: editName.trim(), email: editEmail.trim() });
                  setCurrentUserState(prev => prev ? { ...prev, name: editName.trim(), email: editEmail.trim() } : prev);
                  toast.success("Identity synchronized");
                  setProfileOpen(false);
                }}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Core Metrics */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {role === "freelancer" ? (
          <>
            <StatCard icon={FileText} label="Active Proposals" value={myBids.length.toString()} note="Submitted to clients" />
            <StatCard icon={Briefcase} label="Current Jobs" value={activeJobs.length.toString()} note="Work in progress" />
            <StatCard icon={CheckCircle} label="Completed" value={completedJobs.length.toString()} note="Successfully delivered" />
            <StatCard icon={TrendingUp} label="Total Earnings" value={formatInrCompact(totalBidValue)} note="Lifetime value" />
          </>
        ) : (
          <>
            <StatCard icon={Briefcase} label="Posted Jobs" value={postedJobs.length.toString()} note="Total listings" />
            <StatCard icon={Users} label="Total Candidates" value={allBids.filter(b => postedJobs.some(j => j.id === b.jobId)).length.toString()} note="Across all jobs" />
            <StatCard icon={Target} label="Active Contracts" value={activeJobs.length.toString()} note="Currently underway" />
            <StatCard icon={TrendingUp} label="Total Spent" value={formatInrCompact(recruiterSpend)} note="Lifetime expenditure" />
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Left Column (Feed) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">{role === "freelancer" ? "Recommended For You" : "Your Postings"}</h2>
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
                <Card className="bg-[#0b1528] border-white/5 hover:border-primary/30 transition-all cursor-pointer group shadow-md">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{job.title}</h3>
                      <Badge className={statusStyles[job.status] || "bg-white/10"}>{job.status}</Badge>
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2 mb-4">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-white/40">
                      <span className="flex items-center gap-1.5 bg-[#050b18] px-3 py-1.5 rounded-lg border border-white/5">
                        <Target className="h-3.5 w-3.5 text-primary" /> {job.category}
                      </span>
                      <span className="flex items-center gap-1.5 bg-[#050b18] px-3 py-1.5 rounded-lg border border-white/5">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> ₹{formatUsdAsInr(job.budgetMax)} Budget
                      </span>
                      <span className="flex items-center gap-1.5 bg-[#050b18] px-3 py-1.5 rounded-lg border border-white/5">
                        <Clock className="h-3.5 w-3.5 text-yellow-500" /> {job.deliveryTimeMax} days max
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(role === "freelancer" ? allJobs : postedJobs).length === 0 && (
              <div className="p-8 text-center text-white/40 border border-white/5 border-dashed rounded-xl">
                No jobs found. {role === "recruiter" && "Post your first job to get started!"}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          <Card className="bg-[#0b1528] border-white/5 shadow-md">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg text-white">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
                  <span>Job Success</span>
                  <span className="text-primary">{successScore}%</span>
                </div>
                <div className="h-2 bg-[#050b18] rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-primary" style={{ width: `${successScore}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {role === "freelancer" && (
            <Card className="bg-[#0b1528] border-white/5 shadow-md">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg text-white">Recent Proposals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {myBids.slice(0, 3).map(bid => {
                    const job = allJobs.find(j => j.id === bid.jobId);
                    return (
                      <Link key={bid.id} to="/jobs/$jobId" params={{ jobId: bid.jobId }} className="block p-4 hover:bg-white/5 transition-colors">
                        <p className="font-semibold text-sm text-white truncate">{job?.title || "Unknown Job"}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-primary font-bold">₹{formatUsdAsInr(bid.amount)}</span>
                          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${statusStyles[bid.status] || 'bg-white/10'}`}>
                            {bid.status}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                  {myBids.length === 0 && (
                     <div className="p-6 text-center text-xs text-white/40">You haven't submitted any proposals yet.</div>
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
