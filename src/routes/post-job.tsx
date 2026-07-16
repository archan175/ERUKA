import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  IndianRupee,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { inrToUsd, formatInr } from "@/lib/currency";
import { savePostedJob } from "@/lib/local-data";
import { categories } from "@/lib/mock-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const DRAFT_KEY = "eruka_job_draft";
const commonSkills = ["React", "TypeScript", "Node.js", "Python", "Figma", "AWS", "UI/UX", "SEO"];

type JobDraft = {
  title: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  category: string;
  skills: string[];
};

const emptyDraft: JobDraft = {
  title: "",
  description: "",
  budgetMin: "",
  budgetMax: "",
  deadline: "",
  category: "",
  skills: [],
};

export const Route = createFileRoute("/post-job")({
  head: () => ({
    meta: [
      { title: "Post a Job — ERUKA" },
      {
        name: "description",
        content:
          "Post a freelance job on ERUKA and receive tailored proposals from skilled talent.",
      },
    ],
  }),
  beforeLoad: () => {
    if (!getCurrentUser()) throw redirect({ to: "/login" });
  },
  component: PostJobPage,
});

function PostJobPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<JobDraft>(emptyDraft);
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const minimumDeadline = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return;
    try {
      setDraft({ ...emptyDraft, ...(JSON.parse(savedDraft) as Partial<JobDraft>) });
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasContent = Object.values(draft).some((value) =>
      Array.isArray(value) ? value.length > 0 : value.trim().length > 0,
    );
    if (hasContent) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const updateDraft = <Key extends keyof JobDraft>(key: Key, value: JobDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const addSkill = (value = skillInput) => {
    const cleanSkill = value.trim();
    if (
      !cleanSkill ||
      draft.skills.some((skill) => skill.toLowerCase() === cleanSkill.toLowerCase())
    ) {
      return;
    }
    updateDraft("skills", [...draft.skills, cleanSkill]);
    setSkillInput("");
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (draft.title.trim().length < 8) {
        nextErrors.title = "Use a clear title with at least 8 characters.";
      }
      if (!draft.category) nextErrors.category = "Choose the closest category.";
      if (draft.description.trim().length < 80) {
        nextErrors.description =
          "Add at least 80 characters so freelancers can estimate accurately.";
      }
    }

    if (currentStep === 2) {
      const minimum = Number(draft.budgetMin);
      const maximum = Number(draft.budgetMax);
      if (!minimum || minimum < 1000)
        nextErrors.budgetMin = "Minimum budget must be at least ₹1,000.";
      if (!maximum || maximum <= minimum) {
        nextErrors.budgetMax = "Maximum budget must be greater than the minimum.";
      }
      if (!draft.deadline || draft.deadline < minimumDeadline) {
        nextErrors.deadline = "Choose a future deadline.";
      }
      if (draft.skills.length === 0) nextErrors.skills = "Add at least one required skill.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(3, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publishJob = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      void navigate({ to: "/login" });
      return;
    }

    setSubmitting(true);
    try {
      // Resolve the actual Supabase UUID so the RLS policy (auth.uid() = recruiter_id) passes
      let recruiterId = currentUser.id || currentUser.email;
      let recruiterName = currentUser.name;
      if (isSupabaseConfigured && supabase) {
        const { data: sessionData } = await supabase.auth.getUser();
        if (sessionData?.user) {
          recruiterId = sessionData.user.id;
          recruiterName =
            currentUser.name ||
            sessionData.user.user_metadata?.name ||
            sessionData.user.email?.split("@")[0] ||
            "ERUKA User";
        }
      }

      const job = {
        id: `job-${Date.now()}`,
        title: draft.title.trim(),
        description: draft.description.trim(),
        budgetMin: inrToUsd(Number(draft.budgetMin)),
        budgetMax: inrToUsd(Number(draft.budgetMax)),
        skills: draft.skills,
        deadline: draft.deadline,
        status: "open" as const,
        recruiterId,
        recruiterName,
        createdAt: new Date().toISOString().slice(0, 10),
        bidsCount: 0,
        category: draft.category,
      };

      await savePostedJob(job);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success("Your job is live", {
        description: "Freelancers can now review the brief and submit proposals.",
      });
      void navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
    } catch (err) {
      console.error("[publishJob] error:", err);
      toast.error("Could not publish the job", {
        description: "Your draft is safe. Please try again.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="mb-3 border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Draft autosaved
          </Badge>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Post a clear project brief
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Better briefs attract better proposals. ERUKA will preserve your progress while you
            work.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void navigate({ to: "/dashboard" })}>
          Save and exit
        </Button>
      </div>

      <div className="mb-8 rounded-2xl border border-border/70 bg-card p-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">Step {step} of 3</span>
          <span className="text-muted-foreground">
            {step === 1
              ? "Project basics"
              : step === 2
                ? "Budget and skills"
                : "Review and publish"}
          </span>
        </div>
        <Progress value={(step / 3) * 100} />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Brief", "Scope", "Review"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const targetStep = index + 1;
                if (targetStep < step || validateStep(step)) setStep(targetStep);
              }}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                step === index + 1
                  ? "bg-primary/10 text-primary"
                  : step > index + 1
                    ? "text-success"
                    : "text-muted-foreground"
              }`}
            >
              {step > index + 1 && <Check className="mr-1 inline h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-7">
              <SectionHeading
                icon={FileText}
                title="Describe the outcome"
                description="Focus on what success looks like, not only the tools involved."
              />

              <Field label="Project title" error={errors.title}>
                <Input
                  placeholder="e.g. Build a conversion-focused Shopify storefront"
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  className="mt-2 h-11 bg-background"
                  maxLength={100}
                  autoFocus
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {draft.title.length}/100
                </p>
              </Field>

              <Field label="Category" error={errors.category}>
                <select
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter((category) => category !== "All")
                    .map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                </select>
              </Field>

              <Field label="Project description" error={errors.description}>
                <textarea
                  placeholder="Explain the business goal, key deliverables, important constraints, and what you will provide..."
                  value={draft.description}
                  onChange={(event) => updateDraft("description", event.target.value)}
                  rows={9}
                  maxLength={3000}
                  className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Recommended: 150–600 words</span>
                  <span>{draft.description.length}/3000</span>
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-7">
              <SectionHeading
                icon={IndianRupee}
                title="Set expectations"
                description="A realistic range and clear skill list help qualified people self-select."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Minimum budget (INR)" error={errors.budgetMin}>
                  <Input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="50,000"
                    value={draft.budgetMin}
                    onChange={(event) => updateDraft("budgetMin", event.target.value)}
                    className="mt-2 h-11 bg-background"
                  />
                </Field>
                <Field label="Maximum budget (INR)" error={errors.budgetMax}>
                  <Input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="1,00,000"
                    value={draft.budgetMax}
                    onChange={(event) => updateDraft("budgetMax", event.target.value)}
                    className="mt-2 h-11 bg-background"
                  />
                </Field>
              </div>

              {Number(draft.budgetMin) > 0 && Number(draft.budgetMax) > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <span className="text-muted-foreground">Published budget: </span>
                  <strong>
                    {formatInr(Number(draft.budgetMin))} – {formatInr(Number(draft.budgetMax))}
                  </strong>
                </div>
              )}

              <Field label="Proposal deadline" error={errors.deadline}>
                <div className="relative mt-2">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    min={minimumDeadline}
                    value={draft.deadline}
                    onChange={(event) => updateDraft("deadline", event.target.value)}
                    className="h-11 bg-background pl-10"
                  />
                </div>
              </Field>

              <Field label="Required skills" error={errors.skills}>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add a skill"
                    value={skillInput}
                    onChange={(event) => setSkillInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                    className="h-11 bg-background"
                  />
                  <Button type="button" variant="secondary" onClick={() => addSkill()}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {commonSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>

                {draft.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-muted/50 p-3">
                    {draft.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1.5 py-1.5">
                        {skill}
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(
                              "skills",
                              draft.skills.filter((currentSkill) => currentSkill !== skill),
                            )
                          }
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-7">
              <SectionHeading
                icon={Check}
                title="Review before publishing"
                description="Confirm that freelancers have everything needed to submit an accurate proposal."
              />

              <div className="rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary">{draft.category}</Badge>
                    <h2 className="mt-3 text-2xl font-bold">{draft.title}</h2>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Project budget</p>
                    <p className="font-bold">
                      {formatInr(Number(draft.budgetMin))} – {formatInr(Number(draft.budgetMax))}
                    </p>
                  </div>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {draft.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {draft.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-5 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                  Proposal deadline: <strong className="text-foreground">{draft.deadline}</strong>
                </div>
              </div>

              <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm leading-6">
                By publishing, you confirm that the project details are accurate and that you are
                ready to review freelancer proposals.
              </div>
            </div>
          )}

          <div className="mt-9 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button type="button" variant="hero" onClick={goNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" variant="hero" onClick={publishJob} disabled={submitting}>
                {submitting ? "Publishing…" : "Publish job"}
                {!submitting && <Check className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
