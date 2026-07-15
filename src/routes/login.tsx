import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Lock, ArrowRight, Briefcase, Eye, EyeOff } from "lucide-react";
import { loginUser, signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — ERUKA" },
      {
        name: "description",
        content: "Log in to your ERUKA account to manage bids, jobs, and messages.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md gradient-card border-border/50">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Log in to your ERUKA account</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setFormErrors({});

              let isValid = true;
              const errors: { email?: string; password?: string } = {};

              if (!email.includes("@") || !email.includes(".")) {
                errors.email = "Please enter a valid email address.";
                isValid = false;
              }
              if (password.length < 8) {
                errors.password = "Password must be at least 8 characters.";
                isValid = false;
              }

              if (!isValid) {
                setFormErrors(errors);
                return;
              }

              const result = await loginUser(email, password);
              if (!result.ok) {
                setError(result.message);
                return;
              }

              void navigate({ to: "/dashboard" });
            }}
          >
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`pl-10 bg-input/50 ${formErrors.email ? "border-destructive" : ""}`}
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-10 pr-10 bg-input/50 ${formErrors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-xs text-destructive">{formErrors.password}</p>
              )}
            </div>
            <Button variant="hero" className="w-full gap-2" type="submit">
              Log In <ArrowRight className="h-4 w-4" />
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
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
