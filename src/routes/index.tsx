import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import {
  Briefcase,
  Users,
  Shield,
  Zap,
  Star,
  ArrowRight,
  TrendingUp,
  Globe,
  CheckCircle,
  Sparkles,
  Award,
  Code,
  PenTool,
  MonitorPlay,
  ClipboardCheck,
  MessageCircle,
  WalletCards,
  IndianRupee,
  MousePointer2,
} from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { mockJobs } from "@/lib/mock-data";
import { useRef, useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "ERUKA is India's modern freelancing platform. Post a job, get bids from verified freelancers, and pay securely via escrow.",
      },
    ],
  }),
  component: Index,
});

const stats = [
  { label: "Active Freelancers", value: 12, suffix: "K+", prefix: "", icon: Users },
  { label: "Jobs Completed", value: 45, suffix: "K+", prefix: "", icon: CheckCircle },
  { label: "Total Earnings Paid", value: 230, suffix: "Cr+", prefix: "₹", icon: TrendingUp },
  { label: "Countries", value: 90, suffix: "+", prefix: "", icon: Globe },
];

const features = [
  {
    icon: Briefcase,
    title: "Smart Bidding",
    description:
      "Place competitive bids with proposal messages and delivery timelines. Our system highlights the best offers.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description:
      "Escrow-protected payments ensure freelancers get paid and clients get quality work delivered.",
  },
  {
    icon: Zap,
    title: "Real-time Chat",
    description:
      "Communicate directly with clients and freelancers through our built-in messaging system.",
  },
  {
    icon: Star,
    title: "Rating System",
    description:
      "Build your reputation with verified reviews and ratings after each completed project.",
  },
];

const topTalent = [
  {
    name: "Ananya Krishnan",
    role: "Senior UX Designer",
    skills: ["Figma", "UI/UX", "Prototyping"],
    rating: "4.9",
    jobs: 124,
    img: "https://ui-avatars.com/api/?name=Ananya+Krishnan&background=0D8ABC&color=fff",
    cover:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Rohan Malhotra",
    role: "Full Stack Developer",
    skills: ["React", "Node.js", "TypeScript"],
    rating: "5.0",
    jobs: 89,
    img: "https://ui-avatars.com/api/?name=Rohan+Malhotra&background=ff5722&color=fff",
    cover:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Priya Sharma",
    role: "Brand Strategist",
    skills: ["Marketing", "Branding", "SEO"],
    rating: "4.8",
    jobs: 210,
    img: "https://ui-avatars.com/api/?name=Priya+Sharma&background=4caf50&color=fff",
    cover:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
  },
];

const marketplaceMoments = [
  {
    title: "Live client brief",
    subtitle: "Product team reviewing proposals",
    metric: "12 bids",
    img: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80",
    icon: Briefcase,
  },
  {
    title: "Talent shortlist",
    subtitle: "Verified freelancers ready to chat",
    metric: "4 matched",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    icon: Users,
  },
  {
    title: "Milestone protected",
    subtitle: "Escrow keeps each delivery clear",
    metric: "₹2.4L",
    img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=900&q=80",
    icon: Shield,
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Post a Job",
    desc: "Describe your project, set your budget, and publish it to our talent pool.",
    img: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80",
    icon: ClipboardCheck,
  },
  {
    step: "02",
    title: "Review Bids",
    desc: "Get proposals from verified freelancers and review their portfolios.",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    icon: MessageCircle,
  },
  {
    step: "03",
    title: "Hire & Work",
    desc: "Choose the best fit, fund the escrow, and start collaborating.",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    icon: WalletCards,
  },
];

const differenceHighlights = [
  {
    title: "India-first platform",
    desc: "Budgets and payments stay in INR, with local expectations built into every brief.",
    img: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=900&q=80",
    icon: IndianRupee,
  },
  {
    title: "Bid-based matching",
    desc: "Clients get project-specific proposals instead of generic one-size-fits-all listings.",
    img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
    icon: MousePointer2,
  },
  {
    title: "Escrow protection",
    desc: "Funds are held safely until delivery is approved, protecting both sides of the deal.",
    img: "https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=900&q=80",
    icon: Shield,
  },
];

const categories = [
  {
    name: "Development & IT",
    icon: Code,
    count: "12,450",
    img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Design & Creative",
    icon: PenTool,
    count: "8,200",
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Sales & Marketing",
    icon: TrendingUp,
    count: "4,600",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Video & Animation",
    icon: MonitorPlay,
    count: "3,150",
    img: "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?auto=format&fit=crop&w=600&q=80",
  },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 40, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 100, damping: 20, mass: 1 },
  },
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

function Counter({ value, suffix, prefix }: { value: number; suffix: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (v) => setCount(Math.floor(v)),
      });
      return controls.stop;
    }
  }, [isInView, value]);
  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
}

function Index() {
  const navigate = useNavigate();
  const featuredJobs = mockJobs.filter((j) => j.status === "open").slice(0, 3);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacityBg = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Hero Parallax State
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 20; // max 10 deg
    const y = (clientY / innerHeight - 0.5) * -20;
    setMousePosition({ x, y });
  };
  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div className="overflow-hidden">
      {/* HERO SECTION */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden"
      >
        {/* Animated Background Elements */}
        <motion.div
          style={{ y: yBg, opacity: opacityBg }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-purple-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 w-full">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Hero Content */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={fadeUp}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-md">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    India-first freelance collaboration
                  </span>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-7xl">
                  Hire better talent. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-purple-600 animate-pulse">
                    Deliver work faster.
                  </span>
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  Find skilled professionals, compare tailored proposals, manage milestones, and
                  keep every payment protected in one focused workspace.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-col gap-4 pt-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = new FormData(e.currentTarget).get("q");
                    navigate({ to: "/jobs", search: { search: q as string } as any });
                  }}
                  className="flex w-full max-w-md items-center space-x-2 rounded-full border border-border/50 bg-background/50 p-1.5 backdrop-blur-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 shadow-sm"
                >
                  <div className="flex-1 px-4">
                    <input
                      name="q"
                      aria-label="Search jobs"
                      placeholder="Search React, design, AI..."
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button type="submit" className="rounded-full px-6">
                    Search
                  </Button>
                </form>
                <div className="flex flex-wrap gap-4 mt-2">
                  <Link to="/post-job">
                    <Button
                      size="lg"
                      className="h-14 px-8 text-base font-semibold shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] transition-shadow duration-300 rounded-full"
                    >
                      Hire Top Talent
                    </Button>
                  </Link>

                  <Link to="/jobs">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-14 px-8 text-base font-semibold rounded-full border-border bg-background/50 backdrop-blur-sm hover:bg-muted/50"
                    >
                      Find Work
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  No platform fee to explore opportunities. Create an account when you are ready to
                  apply.
                </p>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="flex items-center gap-6 pt-6 border-t border-border/50"
              >
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <img
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-background"
                      src={`https://i.pravatar.cc/100?img=${i + 10}`}
                      alt="avatar"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm font-medium mt-1">Trusted by 10k+ businesses</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative block perspective-1000 w-full max-w-lg mx-auto mt-12 lg:mt-0 mb-8 lg:mb-0"
            >
              <motion.div
                animate={{
                  rotateY: mousePosition.x,
                  rotateX: mousePosition.y,
                }}
                transition={{ type: "spring", stiffness: 75, damping: 15 }}
                className="preserve-3d relative w-full aspect-[4/5]"
              >
                {/* Base Hero Image */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 group">
                  <img
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"
                    alt="Professional Freelancer"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 to-transparent mix-blend-overlay" />
                </div>

                {/* Floating Glass Card (Escrow Contract) */}
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="absolute -bottom-6 left-2 right-2 sm:left-auto sm:right-12 sm:-bottom-8 sm:-left-8 rounded-2xl glass p-4 sm:p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <Award className="text-white w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">
                          Escrow Contract
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          In Progress • Milestone 2
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 hover:bg-green-100 shadow-sm border-none"
                    >
                      Secured
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-3 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="mt-6 flex justify-between items-end">
                      <div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          Total Budget
                        </div>
                        <div className="text-2xl font-extrabold text-slate-800 dark:text-white">
                          ₹3,75,000
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shadow-sm">
                        <CheckCircle className="text-green-600 dark:text-green-400 w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Floating Notification */}
                  <motion.div
                    animate={{ x: [0, 10, 0], y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                    style={{ transform: "translateZ(30px)" }}
                    className="absolute -right-4 top-1/4 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Shield className="text-green-600 w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        Payment Released
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUSTED COMPANIES MARQUEE */}
      <section className="relative z-20 border-y border-border/50 bg-background/80 backdrop-blur-xl overflow-hidden py-8">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10"></div>
        <p className="text-center text-xs text-muted-foreground mb-4 tracking-widest uppercase font-medium">
          Trusted by freelancers &amp; businesses worldwide
        </p>
        <div className="flex w-[200%] animate-marquee">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center justify-around w-1/2 min-w-full gap-8 px-4">
              {[
                "Startups",
                "Agencies",
                "Enterprises",
                "SMBs",
                "SaaS Companies",
                "E-Commerce",
                "FinTech",
                "EdTech",
              ].map((company) => (
                <div
                  key={company}
                  className="text-2xl font-black text-slate-400 dark:text-slate-600 mx-8 opacity-40 hover:opacity-100 hover:text-primary transition-all duration-300 cursor-default"
                >
                  {company}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="relative z-20 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 divide-x divide-border/50">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center px-4"
              >
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-extrabold text-foreground mb-1">
                  <Counter value={stat.value as number} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE MARKETPLACE PREVIEW */}
      <section className="relative z-20 mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative min-h-[440px] overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
          >
            <img
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80"
              alt="Client team reviewing freelance project work"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-950/45 to-transparent" />
            <div className="absolute left-6 right-6 top-6 flex flex-wrap items-center gap-3">
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">
                Live workspace
              </Badge>
              <Badge className="border-emerald-300/30 bg-emerald-400/20 text-emerald-50 hover:bg-emerald-400/20">
                3 milestones active
              </Badge>
            </div>
            <div className="absolute bottom-6 left-6 right-6 max-w-xl">
              <h2 className="text-3xl font-black text-white sm:text-4xl">
                See the whole project move from brief to delivery.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
                ERUKA keeps proposals, chat, escrow, and milestone progress in one focused place,
                so the home page feels like the actual product, not empty marketing space.
              </p>
            </div>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute right-5 top-24 hidden w-64 rounded-2xl border border-white/20 bg-white/90 p-4 shadow-2xl backdrop-blur md:block"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Proposal pulse
                </p>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="space-y-3">
                {["React dashboard", "Brand identity", "AI support bot"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl bg-slate-100 p-3">
                    <span className="text-xs font-semibold text-slate-700">{item}</span>
                    <span className="text-xs font-bold text-primary">{index + 3} bids</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <div className="grid gap-4">
            {marketplaceMoments.map((moment, index) => (
              <motion.div
                key={moment.title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                whileHover={{ y: -4 }}
                className="group grid min-h-32 grid-cols-[8rem_1fr] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-xl sm:grid-cols-[11rem_1fr]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={moment.img}
                    alt={moment.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-slate-950/15" />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="min-w-0">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <moment.icon className="h-5 w-5" />
                    </div>
                    <h3 className="truncate text-base font-bold">{moment.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {moment.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-muted/40 px-3 py-1 text-xs font-bold text-foreground">
                    {moment.metric}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-24 mx-auto max-w-7xl px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-b from-blue-50 to-transparent opacity-50 rounded-bl-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
            Workflow
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">How it works</h2>
          <p className="text-lg text-muted-foreground">
            Three simple steps to hire the perfect match for your next project.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 relative">
          <div className="hidden md:block absolute top-1/2 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0" />

          {workflowSteps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10"
            >
              <div className="group h-full overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-primary shadow-lg backdrop-blur">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="absolute bottom-5 right-5 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-sm font-black text-white backdrop-blur">
                    {item.step}
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-xl"
            >
              <h2 className="text-3xl font-bold sm:text-4xl mb-4">Browse talent by category</h2>
              <p className="text-muted-foreground text-lg">
                Find exactly what you need from our extensive directory of professional freelancers.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Link to="/jobs">
                <Button variant="outline" className="rounded-full group">
                  All Categories
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to="/jobs"
                  search={{ category: cat.name }}
                  className="block group relative overflow-hidden rounded-2xl border border-border/50 hover:shadow-xl transition-all cursor-pointer h-72"
                >
                  <img
                    src={cat.img}
                    alt={`${cat.name} category`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 group-hover:bg-primary/90 transition-colors">
                      <cat.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-xl text-white mb-1">{cat.name}</h3>
                    <p className="text-sm text-slate-300 font-medium">{cat.count} professionals</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TOP FREELANCERS */}
      <section className="py-24 mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold sm:text-4xl mb-4">Meet our top talent</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Work with the highest-rated professionals who have proven track records of delivering
            excellence.
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {topTalent.map((talent, i) => (
            <motion.div
              key={talent.name}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 100, damping: 20 }}
              whileHover={{ scale: 1.02, rotateY: 5, rotateX: -5 }}
              className="group relative bg-card rounded-3xl border border-border/50 p-6 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 transform-gpu perspective-1000 preserve-3d"
            >
              <div className="-mx-6 -mt-6 mb-6 h-40 overflow-hidden">
                <img
                  src={talent.cover}
                  alt={`${talent.role} portfolio preview`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute left-0 right-0 top-0 h-40 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <Badge className="absolute right-4 top-4 border-white/20 bg-white/90 text-slate-800 hover:bg-white/90">
                  Available this week
                </Badge>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />

              <div
                className="flex items-start gap-4 mb-6"
                style={{ transform: "translateZ(20px)" }}
              >
                <div className="relative">
                  <img
                    src={talent.img}
                    alt={talent.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{talent.name}</h3>
                  <p className="text-sm text-primary font-medium mb-1">{talent.role}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-slate-700">{talent.rating}</span>
                    <span>({talent.jobs} jobs)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-8" style={{ transform: "translateZ(15px)" }}>
                {talent.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="bg-slate-100 hover:bg-slate-200"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>

              <Link
                to="/profile"
                search={{ user: talent.name }}
                className="block w-full"
                style={{ transform: "translateZ(30px)" }}
              >
                <Button className="w-full rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                  View Profile
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bg-slate-900 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">Why businesses trust ERUKA</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              We provide the tools, security, and talent network you need to succeed in the
              freelance economy.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Poster Image */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[600px] border border-white/10 shadow-2xl group"
            >
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                alt="Team collaborating on ERUKA platform"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/20">
                <div className="flex items-center gap-4 mb-3">
                  <img
                    className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                    src="https://ui-avatars.com/api/?name=Ravi+Shankar&background=fff&color=000"
                    alt="Ravi Shankar"
                  />
                  <div>
                    <div className="text-base text-white font-bold">Ravi Shankar</div>
                    <div className="text-xs text-slate-300">CTO at BuildFast Technologies</div>
                  </div>
                </div>
                <div className="flex text-yellow-400 text-sm mb-2">⭐⭐⭐⭐⭐</div>
                <p className="text-slate-200 text-sm italic font-medium leading-relaxed">
                  "ERUKA transformed how we hire talent. The process is seamless and the quality is
                  unmatched."
                </p>
              </div>
            </motion.div>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  <div className="mb-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW ERUKA IS DIFFERENT */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">How ERUKA is Different</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for the modern workforce with transparency and security at its core.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-8">
            {differenceHighlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group overflow-hidden rounded-3xl border border-border/50 bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                  <div className="absolute bottom-5 left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-primary shadow-lg backdrop-blur">
                    <item.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED JOBS */}
      <motion.section
        className="py-24 mx-auto max-w-7xl px-4 sm:px-6"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl mb-3">Featured Jobs</h2>
            <p className="text-muted-foreground text-lg">
              Latest opportunities waiting for your expertise.
            </p>
          </div>
          <Link to="/jobs">
            <Button
              variant="ghost"
              className="group text-primary hover:text-primary hover:bg-primary/5 rounded-full"
            >
              Explore All Jobs{" "}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        <div className="mb-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            whileHover={{ y: -4 }}
            className="group relative min-h-72 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm"
          >
            <img
              src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=80"
              alt="Freelancers collaborating on project opportunities"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent" />
            <div className="absolute inset-x-6 bottom-6 max-w-lg">
              <Badge className="mb-4 border-white/20 bg-white/15 text-white hover:bg-white/15">
                Opportunity board
              </Badge>
              <h3 className="text-2xl font-black text-white sm:text-3xl">
                Fresh briefs, real budgets, and proposals that move fast.
              </h3>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {([
              ["Open briefs", "28", Briefcase],
              ["Avg. first bid", "18m", MessageCircle],
              ["Escrow ready", "₹42L", Shield],
            ] as const).map(([label, value, Icon]) => (
              <motion.div
                key={label}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden mt-12 rounded-t-[3rem]">
        {/* Poster Background Image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center bg-fixed" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-primary/80 to-purple-900/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl mb-6 leading-tight">
              Ready to elevate your workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join thousands of businesses and freelancers building the future together on ERUKA.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-white text-primary hover:bg-slate-100 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-shadow"
                >
                  Get Started for Free
                </Button>
              </Link>
              <Link to="/post-job">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-bold bg-transparent border-white text-white hover:bg-white/10 hover:text-white rounded-full"
                >
                  Post a Job
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
