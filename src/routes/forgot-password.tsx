import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/lib/auth";
import { ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — ERUKA" },
      { name: "description", content: "Reset your ERUKA password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md gradient-card border-border/50">
        <CardContent className="p-8">
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email to receive a reset link.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setMessage("");

              const result = await sendPasswordReset(email);
              if (!result.ok) {
                setError(result.message);
                return;
              }

              setMessage("If this email exists, you'll receive a reset link shortly.");
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
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10 bg-input/50"
                />
              </div>
            </div>

            <Button variant="hero" className="w-full" type="submit" disabled={!email.trim()}>
              Send Reset Link
            </Button>

            {message && <p className="text-sm text-success">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
