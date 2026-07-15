import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/lib/auth";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — ERUKA" },
      { name: "description", content: "Set a new password for your ERUKA account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md gradient-card border-border/50">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Set New Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");

              if (password.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
              }

              if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }

              const result = await updatePassword(password);
              if (!result.ok) {
                setError(result.message);
                return;
              }

              void navigate({ to: "/login" });
            }}
          >
            <div>
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 bg-input/50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="pl-10 bg-input/50"
                />
              </div>
            </div>

            <Button variant="hero" className="w-full" type="submit">
              Update Password
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
