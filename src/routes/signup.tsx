import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Lock, User, ArrowRight, Briefcase, Eye, EyeOff } from "lucide-react";
import { signInWithGoogle, signUpUser } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign Up — ERUKA" },
      {
        name: "description",
        content: "Create your free ERUKA account and start hiring or freelancing today.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"freelancer" | "recruiter">("freelancer");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md gradient-card border-border/50">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Join ERUKA and start your journey</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setFormErrors({});

              let isValid = true;
              const errors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};

              if (name.trim().length < 2 || /\d/.test(name)) {
                errors.name = "Please enter a valid name (min 2 letters, no numbers).";
                isValid = false;
              }
              
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email.trim())) {
                errors.email = "Please enter a complete and valid email address (e.g. you@example.com).";
                isValid = false;
              }
              
              const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
              if (!passwordRegex.test(password)) {
                errors.password = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
                isValid = false;
              }
              
              if (password !== confirmPassword) {
                errors.confirmPassword = "Passwords do not match.";
                isValid = false;
              }

              if (!isValid) {
                setFormErrors(errors);
                return;
              }

              const result = await signUpUser({
                id: `user-${Date.now()}`,
                name: name.trim(),
                email: email.trim(),
                password,
                role,
              });

              if (!result.ok) {
                setError(result.message);
                return;
              }

              void navigate({ to: "/dashboard" });
            }}
          >
            {/* Role selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("freelancer")}
                className={`rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  role === "freelancer"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                🎯 Freelancer
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                className={`rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                  role === "recruiter"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                🏢 Recruiter
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormErrors(prev => ({...prev, name: undefined})) }}
                  className={`pl-10 bg-input/50 ${formErrors.name ? 'border-destructive' : ''}`}
                />
              </div>
              {formErrors.name && <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFormErrors(prev => ({...prev, email: undefined})) }}
                  className={`pl-10 bg-input/50 ${formErrors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {formErrors.email && <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFormErrors(prev => ({...prev, password: undefined})) }}
                  className={`pl-10 pr-10 bg-input/50 ${formErrors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && <p className="mt-1 text-xs text-destructive">{formErrors.password}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors(prev => ({...prev, confirmPassword: undefined})) }}
                  className={`pl-10 pr-10 bg-input/50 ${formErrors.confirmPassword ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.confirmPassword && <p className="mt-1 text-xs text-destructive">{formErrors.confirmPassword}</p>}
            </div>
            <Button variant="hero" className="w-full gap-2" type="submit">
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              setError("");
              const result = await signInWithGoogle();
              if (!result.ok) setError(result.message);
            }}
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
