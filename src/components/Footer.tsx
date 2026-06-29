import { BriefcaseBusiness, Mail } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BUILD_COMMIT } from "@/lib/buildInfo";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-20 border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <BriefcaseBusiness className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">ERUKA</span>
            </div>
            <p className="max-w-sm text-slate-400 text-lg leading-relaxed font-light mb-4">
              Where Talent Meets Opportunity. The modern platform connecting top freelancers with
              innovative businesses.
            </p>
            <p className="max-w-sm text-slate-500 text-sm leading-relaxed">
              ERUKA was built to give Indian freelancers and businesses a platform that speaks their
              language — literally and financially. We believe great talent deserves great
              opportunities, and great projects deserve great execution.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-tight">Platform</h4>
            <div className="flex flex-col gap-4 font-medium">
              <Link to="/jobs" className="hover:text-primary transition-colors">
                Browse Jobs
              </Link>
              <Link to="/post-job" className="hover:text-primary transition-colors">
                Post a Job
              </Link>
              <Link to="/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-tight">Company</h4>
            <div className="flex flex-col gap-4 font-medium">
              <Link to="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms
              </Link>
              <a
                href="mailto:support@eruka.in"
                className="inline-flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@eruka.in
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-500">
            <p>© 2026 ERUKA. All rights reserved.</p>
            <div className="hidden md:block h-4 w-px bg-white/10"></div>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy
              </a>
              <a href="/terms" className="text-muted-foreground hover:text-foreground">
                Terms
              </a>
              <a href="/contact" className="text-muted-foreground hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
          <div className="text-xs opacity-50 bg-white/5 px-3 py-1 rounded-full border border-white/10 font-mono tracking-wider">
            BUILD: {BUILD_COMMIT}
          </div>
        </div>
      </div>
    </footer>
  );
}
