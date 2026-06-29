import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Bookmark, CalendarDays, Users } from "lucide-react";
import type { Job } from "@/lib/mock-data";
import { getLowestBid } from "@/lib/mock-data";
import { formatUsdAsInr } from "@/lib/currency";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  open: "bg-success/15 text-success border-success/30",
  "in-progress": "bg-warning/15 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export function JobCard({
  job,
  view = "grid",
  isSaved = false,
  onToggleSaved,
}: {
  job: Job;
  view?: "grid" | "list";
  isSaved?: boolean;
  onToggleSaved?: (jobId: string) => void;
}) {
  const lowestBid = getLowestBid(job.id);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_50px_rgba(15,23,42,0.10)]",
        view === "list" && "sm:flex",
      )}
    >
      {onToggleSaved && (
        <button
          type="button"
          onClick={() => onToggleSaved(job.id)}
          className={cn(
            "absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/30 hover:text-primary",
            isSaved && "border-primary/30 bg-primary/10 text-primary",
          )}
          aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          aria-pressed={isSaved}
        >
          <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
        </button>
      )}

      <Link
        to="/jobs/$jobId"
        params={{ jobId: job.id }}
        className={cn("block h-full", view === "list" && "sm:flex sm:w-full")}
      >
        <CardContent
          className={cn(
            "flex h-full flex-col p-5 sm:p-6",
            view === "list" && "sm:w-full sm:flex-row sm:items-center sm:gap-8",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 pr-12">
              <Badge className={`shrink-0 text-[10px] capitalize ${statusStyles[job.status]}`}>
                {job.status.replace("-", " ")}
              </Badge>
              <span className="truncate text-xs font-medium text-muted-foreground">
                {job.category}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
              {job.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {job.recruiterName} · Posted {job.createdAt}
            </p>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {job.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" className="font-medium">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && <Badge variant="secondary">+{job.skills.length - 4}</Badge>}
            </div>
          </div>

          <div
            className={cn(
              "mt-5 border-t border-border/60 pt-4",
              view === "list" && "sm:mt-0 sm:min-w-64 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0",
            )}
          >
            <p className="text-base font-bold text-foreground">
              {formatUsdAsInr(job.budgetMin)} – {formatUsdAsInr(job.budgetMax)}
            </p>
            {lowestBid && (
              <p className="mt-1 text-xs font-medium text-success">
                Current low bid {formatUsdAsInr(lowestBid)}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {job.bidsCount} bids
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {job.deadline}
              </span>
            </div>

            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              View opportunity
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
