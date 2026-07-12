import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BidCard } from "@/components/BidCard";
import { mockBids, mockJobs, type Bid, type Job } from "@/lib/mock-data";
import { fetchPostedJobs, fetchSavedBids, getAllBids, getAllJobs, saveBid } from "@/lib/local-data";
import { getCurrentUser } from "@/lib/auth";
import { formatUsdAsInr, inrToUsd } from "@/lib/currency";
import { ArrowLeft, Users, Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$jobId")({
  head: ({ params }) => {
    const job = mockJobs.find((j) => j.id === params.jobId);
    const schema = job
      ? {
          "@context": "https://schema.org/",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          datePosted: job.createdAt,
          hiringOrganization: {
            "@type": "Organization",
            name: job.recruiterName,
          },
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "IN",
            },
          },
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "INR",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.budgetMin,
              maxValue: job.budgetMax,
              unitText: "PROJECT",
            },
          },
        }
      : null;

    return {
      meta: [
        { title: job ? `${job.title} — ERUKA` : "Job Not Found — ERUKA" },
        { name: "description", content: job?.description?.slice(0, 155) || "Job details on ERUKA" },
      ],
      scripts: schema
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(schema),
            },
          ]
        : [],
    };
  },
  component: JobDetailPage,
});

const statusStyles: Record<string, string> = {
  open: "bg-success/15 text-success border-success/30",
  "in-progress": "bg-warning/15 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border",
};

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>(getAllJobs());
  const [allBids, setAllBids] = useState<Bid[]>(getAllBids());
  const currentUser = getCurrentUser();
  const job = jobs.find((j) => j.id === jobId);
  const bids = allBids.filter((b) => b.jobId === jobId);
  const isOwner = Boolean(
    currentUser &&
    job &&
    (job.recruiterId === currentUser.id || job.recruiterId === currentUser.email),
  );
  const currentUserBids = currentUser
    ? bids.filter(
        (bid) => bid.freelancerId === currentUser.id || bid.freelancerId === currentUser.email,
      )
    : [];
  const visibleBids = isOwner ? bids : currentUserBids;
  const lowestBid = bids.length > 0 ? Math.min(...bids.map((bid) => bid.amount)) : null;
  const lowestBidId =
    bids.length > 0 ? bids.reduce((a, b) => (a.amount < b.amount ? a : b)).id : null;

  const [bidOpen, setBidOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidProposal, setBidProposal] = useState("");
  const [bidDelivery, setBidDelivery] = useState("");

  useEffect(() => {
    void fetchPostedJobs().then((postedJobs) => {
      const postedIds = new Set(postedJobs.map((postedJob) => postedJob.id));
      setJobs([...postedJobs, ...mockJobs.filter((mockJob) => !postedIds.has(mockJob.id))]);
    });

    void fetchSavedBids().then((savedBids) => {
      const savedIds = new Set(savedBids.map((bid) => bid.id));
      setAllBids([...savedBids, ...mockBids.filter((bid) => !savedIds.has(bid.id))]);
    });
  }, []);

  // listen for simulated bid accept events to refresh bids/messages
  useEffect(() => {
    const onBidUpdated = () => {
      void fetchSavedBids().then((savedBids) => {
        const savedIds = new Set(savedBids.map((bid) => bid.id));
        setAllBids([...savedBids, ...mockBids.filter((bid) => !savedIds.has(bid.id))]);
      });
    };
    const onMessageInserted = () => {
      // no-op here; chat page listens for messages. We still refresh bids to pick up accepted state
      onBidUpdated();
    };

    window.addEventListener("eruka:bid-updated", onBidUpdated);
    window.addEventListener("eruka:message-inserted", onMessageInserted);
    return () => {
      window.removeEventListener("eruka:bid-updated", onBidUpdated);
      window.removeEventListener("eruka:message-inserted", onMessageInserted);
    };
  }, []);

  if (!job) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Job not found</h1>
        <Link to="/jobs" className="mt-4 inline-block text-primary hover:underline">
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/jobs"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
              <Badge className={`shrink-0 ${statusStyles[job.status]}`}>
                {job.status.replace("-", " ")}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Posted by {job.recruiterName} · {job.createdAt}
            </p>
          </div>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold mb-3">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <h2 className="text-base font-semibold mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* In-Progress View / Milestone Tracker */}
          {job.status === "in-progress" && (isOwner || currentUserBids.length > 0) && (
            <Card className="gradient-card border-border/50">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Milestone Tracker</h2>
                <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-success/20 text-success flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Project Started</h3>
                      <p className="text-sm text-muted-foreground">Proposal accepted and initial requirements aligned.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Milestone 1: Wireframes & Design</h3>
                      <p className="text-sm text-muted-foreground mb-2">Awaiting delivery from freelancer.</p>
                      {currentUserBids.length > 0 && !isOwner && (
                        <Button size="sm">Submit Deliverables</Button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 items-start opacity-50">
                    <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center" />
                    <div>
                      <h3 className="font-semibold text-foreground">Milestone 2: Final Handover</h3>
                      <p className="text-sm text-muted-foreground">Pending prior milestones.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bids Section */}
          {job.status !== "in-progress" && job.status !== "completed" && (
          <div>
            <h2 className="text-xl font-bold mb-4">
              {isOwner ? `Proposals (${bids.length})` : "Your proposal"}
              {isOwner && lowestBid && (
                <span className="ml-3 text-sm font-normal text-success">
                  Lowest: {formatUsdAsInr(lowestBid)}
                </span>
              )}
            </h2>
            {visibleBids.length > 0 ? (
              <div className="space-y-4">
                {visibleBids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    isLowest={bid.id === lowestBidId}
                    showActions={isOwner && job.status === "open"}
                    onAccept={async () => {
                      if (!isOwner) return;
                      const localData = await import("@/lib/local-data");
                      const updatedBids = bids.map((currentBid) => ({
                        ...currentBid,
                        status:
                          currentBid.id === bid.id ? ("accepted" as const) : ("rejected" as const),
                      }));
                      await Promise.all(
                        updatedBids.map((currentBid) => localData.upsertBid(currentBid)),
                      );

                      const updatedJob: Job = {
                        ...job,
                        assignedFreelancerId: bid.freelancerId,
                        status: "in-progress",
                      };
                      await localData.savePostedJob(updatedJob);
                      await localData.saveMessage({
                        id: `msg-${Date.now()}`,
                        senderId: currentUser?.id || job.recruiterId,
                        receiverId: bid.freelancerId,
                        text: `Your proposal for “${job.title}” was accepted. Let’s align on the first milestone.`,
                        createdAt: new Date().toISOString(),
                      });

                      setAllBids((current) =>
                        current.map((currentBid) => {
                          if (currentBid.jobId !== job.id) return currentBid;
                          return {
                            ...currentBid,
                            status:
                              currentBid.id === bid.id
                                ? ("accepted" as const)
                                : ("rejected" as const),
                          };
                        }),
                      );
                      setJobs((current) =>
                        current.map((currentJob) =>
                          currentJob.id === job.id ? updatedJob : currentJob,
                        ),
                      );
                      toast.success("Proposal accepted", {
                        description: `${bid.freelancerName} has been notified.`,
                      });
                    }}
                    onReject={async () => {
                      if (!isOwner) return;
                      const updatedBid = { ...bid, status: "rejected" } as const;
                      await import("@/lib/local-data").then((m) => m.upsertBid(updatedBid));
                      setAllBids((current) =>
                        current.map((b) => (b.id === bid.id ? updatedBid : b)),
                      );
                      toast.success("Proposal declined");
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="gradient-card border-border/50">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {isOwner
                      ? "No proposals yet. We’ll show qualified applications here."
                      : currentUser
                        ? "You have not submitted a proposal for this project."
                        : "Sign in to submit and track your proposal."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="gradient-card border-border/50 sticky top-20">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-primary text-lg">₹</span>
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-lg font-bold">
                    {formatUsdAsInr(job.budgetMin)} – {formatUsdAsInr(job.budgetMax)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-semibold">{job.deadline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Bids</p>
                  <p className="text-sm font-semibold">{bids.length} proposals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-semibold">{job.category}</p>
                </div>
              </div>

              {job.status === "open" && (
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => {
                    if (isOwner) {
                      toast.info("This is your job post", {
                        description: "Review incoming proposals in the section beside this panel.",
                      });
                      return;
                    }
                    if (!currentUser) {
                      // require login before placing bids
                      void navigate({ to: "/login" });
                      return;
                    }
                    setBidOpen(true);
                  }}
                >
                  {isOwner
                    ? "Manage proposals"
                    : currentUserBids.length > 0
                      ? "Update proposal"
                      : currentUser
                        ? "Place a Bid"
                        : "Sign in to place a bid"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bid Modal */}
      <Dialog open={bidOpen} onOpenChange={setBidOpen}>
        <DialogContent className="gradient-card border-border/50">
          <DialogHeader>
            <DialogTitle>Place Your Bid</DialogTitle>
            <DialogDescription>Submit your proposal for "{job.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Bid Amount (INR)</label>
              <Input
                type="number"
                placeholder="e.g. 250000"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="mt-1 bg-input/50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Budget: {formatUsdAsInr(job.budgetMin)} – {formatUsdAsInr(job.budgetMax)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/80">Enter bid amount in INR.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Delivery Time (days)</label>
              <Input
                type="number"
                placeholder="e.g. 30"
                value={bidDelivery}
                onChange={(e) => setBidDelivery(e.target.value)}
                className="mt-1 bg-input/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Proposal</label>
              <textarea
                placeholder="Describe why you're the best fit (min 10 chars)..."
                value={bidProposal}
                onChange={(e) => setBidProposal(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-input/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBidOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={async () => {
                // double-check login before submitting
                const user = getCurrentUser();
                if (!user) {
                  void navigate({ to: "/login" });
                  return;
                }

                const amountInInr = Number(bidAmount);
                const deliveryDays = Number(bidDelivery);
                if (amountInInr <= 0 || deliveryDays <= 0 || bidProposal.trim().length < 10) {
                  toast.error("Complete your proposal", {
                    description:
                      "Enter a valid amount, delivery time, and at least 10 characters explaining your approach.",
                  });
                  return;
                }

                const existingBid = allBids.find(
                  (bid) =>
                    bid.jobId === job.id &&
                    (bid.freelancerId === user.id || bid.freelancerId === user.email),
                );

                const newBid = {
                  id: existingBid?.id || `bid-${Date.now()}`,
                  jobId: job.id,
                  freelancerId: user.id || user.email,
                  freelancerName: user.name,
                  freelancerRating: 0,
                  freelancerAvatar: (user.name || "GF")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase(),
                  amount: inrToUsd(amountInInr),
                  proposal: bidProposal.trim(),
                  deliveryTime: deliveryDays,
                  status: "pending",
                  createdAt: new Date().toISOString().slice(0, 10),
                } as const;

                if (existingBid) {
                  await import("@/lib/local-data").then((module) => module.upsertBid(newBid));
                  setAllBids((currentBids) =>
                    currentBids.map((bid) => (bid.id === existingBid.id ? newBid : bid)),
                  );
                } else {
                  await saveBid(newBid);
                  setAllBids((currentBids) => [newBid, ...currentBids]);
                }
                setBidAmount("");
                setBidProposal("");
                setBidDelivery("");
                setBidOpen(false);
                toast.success(existingBid ? "Proposal updated" : "Proposal submitted", {
                  description: "You can track its status from your dashboard.",
                });
              }}
              disabled={
                !bidAmount ||
                !bidDelivery ||
                bidProposal.trim().length === 0 ||
                !currentUser ||
                isOwner
              }
            >
              {currentUserBids.length > 0 ? "Update proposal" : "Submit proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
