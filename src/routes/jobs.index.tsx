import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BriefcaseBusiness,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/JobCard";
import { categories, mockJobs, type Job } from "@/lib/mock-data";
import { fetchPostedJobs } from "@/lib/local-data";
import { usdToInr } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

type JobSearch = {
  category?: string;
  search?: string;
};

type SortOption = "newest" | "budget-high" | "budget-low" | "deadline" | "bids";
type ViewOption = "grid" | "list";

const SAVED_JOBS_KEY = "eruka_saved_jobs";

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): JobSearch => ({
    category: search.category as string | undefined,
    search: search.search as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse Jobs — ERUKA" },
      {
        name: "description",
        content:
          "Browse freelance opportunities across development, AI, design, data, mobile, and DevOps.",
      },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [search, setSearch] = useState(searchParams.search || "");
  const [category, setCategory] = useState(searchParams.category || "All");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewOption>("grid");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(SAVED_JOBS_KEY) || "[]") as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    const refreshJobs = () => {
      setLoading(true);
      void fetchPostedJobs().then((postedJobs) => {
        if (!active) return;
        const postedIds = new Set(postedJobs.map((job) => job.id));
        setJobs([...postedJobs, ...mockJobs.filter((job) => !postedIds.has(job.id))]);
        setLoading(false);
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "eruka_posted_jobs") refreshJobs();
    };

    refreshJobs();
    window.addEventListener("eruka:jobs-changed", refreshJobs);
    window.addEventListener("storage", onStorage);

    return () => {
      active = false;
      window.removeEventListener("eruka:jobs-changed", refreshJobs);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(savedJobs));
    }
  }, [savedJobs]);

  const shown = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = jobs.filter((job) => {
      const budgetMinInr = usdToInr(job.budgetMin);
      const budgetMaxInr = usdToInr(job.budgetMax);
      const matchesSearch =
        !normalizedSearch ||
        job.title.toLowerCase().includes(normalizedSearch) ||
        job.description.toLowerCase().includes(normalizedSearch) ||
        job.recruiterName.toLowerCase().includes(normalizedSearch) ||
        job.skills.some((skill) => skill.toLowerCase().includes(normalizedSearch));
      const matchesCategory = category === "All" || job.category === category;
      const matchesBudget =
        budgetFilter === "all" ||
        (budgetFilter === "low" && budgetMaxInr <= 200000) ||
        (budgetFilter === "mid" && budgetMinInr < 500000 && budgetMaxInr > 200000) ||
        (budgetFilter === "high" && budgetMaxInr >= 500000);
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const matchesMine =
        !onlyMine ||
        Boolean(
          currentUser &&
          (job.recruiterId === currentUser.id || job.recruiterId === currentUser.email),
        );
      const matchesSaved = !onlySaved || savedJobs.includes(job.id);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBudget &&
        matchesStatus &&
        matchesMine &&
        matchesSaved
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "budget-high") return b.budgetMax - a.budgetMax;
      if (sort === "budget-low") return a.budgetMin - b.budgetMin;
      if (sort === "deadline") {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sort === "bids") return a.bidsCount - b.bidsCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    budgetFilter,
    category,
    currentUser,
    jobs,
    onlyMine,
    onlySaved,
    savedJobs,
    search,
    sort,
    statusFilter,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== "All" ||
    budgetFilter !== "all" ||
    statusFilter !== "open" ||
    onlyMine ||
    onlySaved;

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setBudgetFilter("all");
    setStatusFilter("open");
    setOnlyMine(false);
    setOnlySaved(false);
    void navigate({ to: "/jobs", search: {} });
  };

  const toggleSaved = (jobId: string) => {
    setSavedJobs((current) =>
      current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId],
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-8 shadow-sm sm:px-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="mb-4 border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            Curated opportunities
          </Badge>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Find work worth doing</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Search by skill, compare transparent budgets, save promising roles, and apply when the
            fit feels right.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <form
          className="flex flex-col gap-3 lg:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({
              to: "/jobs",
              search: {
                ...(search.trim() ? { search: search.trim() } : {}),
                ...(category !== "All" ? { category } : {}),
              },
            });
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, skill, company, or keyword"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 bg-background pl-10"
              aria-label="Search jobs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
            <FilterSelect
              label="Budget"
              value={budgetFilter}
              onChange={setBudgetFilter}
              options={[
                ["all", "All budgets"],
                ["low", "Under ₹2L"],
                ["mid", "₹2L – ₹5L"],
                ["high", "₹5L+"],
              ]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                ["all", "All statuses"],
                ["open", "Open"],
                ["in-progress", "In progress"],
                ["completed", "Completed"],
              ]}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SortOption)}
              className="col-span-2 sm:col-span-1"
              options={[
                ["newest", "Newest first"],
                ["budget-high", "Highest budget"],
                ["budget-low", "Lowest budget"],
                ["deadline", "Closing soon"],
                ["bids", "Fewest bids"],
              ]}
            />
          </div>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={category === item ? "default" : "outline"}
              onClick={() => setCategory(item)}
              className="shrink-0"
            >
              {item}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            size="sm"
            variant={onlySaved ? "default" : "ghost"}
            onClick={() => setOnlySaved((value) => !value)}
          >
            <Bookmark className={cn("h-4 w-4", onlySaved && "fill-current")} />
            Saved ({savedJobs.length})
          </Button>
          {currentUser && (
            <Button
              type="button"
              size="sm"
              variant={onlyMine ? "default" : "ghost"}
              onClick={() => setOnlyMine((value) => !value)}
            >
              <BriefcaseBusiness className="h-4 w-4" />
              My posts
            </Button>
          )}
          {hasActiveFilters && (
            <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">
            {loading ? "Loading opportunities…" : `${shown.length} opportunities`}
          </p>
          <p className="text-xs text-muted-foreground">
            <SlidersHorizontal className="mr-1 inline h-3.5 w-3.5" />
            Results update as you refine your search
          </p>
        </div>
        <div className="flex rounded-xl border border-border/70 bg-card p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "rounded-lg p-2 text-muted-foreground",
              view === "grid" && "bg-primary/10 text-primary",
            )}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "rounded-lg p-2 text-muted-foreground",
              view === "list" && "bg-primary/10 text-primary",
            )}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className={cn("grid gap-5", view === "grid" && "sm:grid-cols-2 lg:grid-cols-3")}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl border border-border/60 bg-card p-6"
            >
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-6 h-6 w-4/5 rounded bg-muted" />
              <div className="mt-3 h-3 w-2/5 rounded bg-muted" />
              <div className="mt-7 h-3 w-full rounded bg-muted" />
              <div className="mt-2 h-3 w-5/6 rounded bg-muted" />
              <div className="mt-7 h-8 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : shown.length > 0 ? (
        <div className={cn("grid gap-5", view === "grid" && "sm:grid-cols-2 lg:grid-cols-3")}>
          {shown.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              view={view}
              isSaved={savedJobs.includes(job.id)}
              onToggleSaved={toggleSaved}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold">No matching opportunities</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Broaden your search, choose a different budget range, or clear your filters to see all
            open work.
          </p>
          <Button className="mt-6" variant="outline" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  className?: string;
}) {
  return (
    <label className={cn("relative", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm font-medium text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring lg:min-w-36"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        ▾
      </span>
    </label>
  );
}
