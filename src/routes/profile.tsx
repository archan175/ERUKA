import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Briefcase, Mail, Edit } from "lucide-react";
import { mockUsers } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";

type ProfileSearch = {
  user?: string;
};

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => {
    return {
      user: search.user as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Profile — ERUKA" },
      { name: "description", content: "View and manage ERUKA profiles." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const searchParams = Route.useSearch();
  const currentUser = getCurrentUser();
  const navigate = useNavigate();
  const fallbackUser = mockUsers[0];
  
  // If ?user=Name is provided, show that user's public profile
  let user = null;
  const isPublicView = !!searchParams.user;

  if (isPublicView) {
    // Top talent mock data from index.tsx mapped to our profile structure
    const topTalent = [
      { name: "Ananya Krishnan", role: "Senior UX Designer", skills: ["Figma", "UI/UX", "Prototyping"], rating: "4.9", jobs: 124, img: "https://ui-avatars.com/api/?name=Ananya+Krishnan&background=0D8ABC&color=fff" },
      { name: "Rohan Malhotra", role: "Full Stack Developer", skills: ["React", "Node.js", "TypeScript"], rating: "5.0", jobs: 89, img: "https://ui-avatars.com/api/?name=Rohan+Malhotra&background=ff5722&color=fff" },
      { name: "Priya Sharma", role: "Brand Strategist", skills: ["Marketing", "Branding", "SEO"], rating: "4.8", jobs: 210, img: "https://ui-avatars.com/api/?name=Priya+Sharma&background=4caf50&color=fff" },
    ];
    
    const matchedTalent = topTalent.find(t => t.name === searchParams.user);
    if (matchedTalent) {
      user = {
        ...fallbackUser,
        name: matchedTalent.name,
        role: matchedTalent.role,
        skills: matchedTalent.skills,
        rating: matchedTalent.rating,
        completedJobs: matchedTalent.jobs,
        avatar: matchedTalent.name.charAt(0),
      };
    } else {
      user = {
        ...fallbackUser,
        name: searchParams.user,
      };
    }
  } else if (currentUser) {
    user = {
      ...fallbackUser,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    };
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Log in to view your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to be signed in before accessing this page.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="hero">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Profile Header */}
      <Card className="gradient-card border-border/50 overflow-hidden">
        <div className="h-32 gradient-hero opacity-60" />
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-card bg-primary/20 text-2xl font-bold text-primary">
              {user.avatar}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
              <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-sm font-semibold">{user.rating}</span>
                <span className="text-xs text-muted-foreground">({user.completedJobs} jobs)</span>
              </div>
            </div>
            {!isPublicView && (
              <a href="/dashboard#edit" className="inline-block">
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" /> Edit Profile
                </Button>
              </a>
            )}
            {isPublicView && (
              <Button variant="hero" size="sm" className="gap-1" onClick={() => {
                void navigate({ to: '/chat' });
              }}>
                <Mail className="h-3.5 w-3.5" /> Contact
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Info */}
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">About</h2>
            <p className="text-sm text-muted-foreground">{user.bio}</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {user.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> {user.completedJobs} jobs completed
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> Member since 2024
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Performance</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">98%</p>
                  <p className="text-xs text-muted-foreground">Job Success</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">₹70L</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">4.9</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
