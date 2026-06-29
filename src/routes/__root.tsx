import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BUILD_COMMIT } from "@/lib/buildInfo";
import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ERUKA — Where Talent Meets Opportunity" },
      {
        name: "description",
        content:
          "ERUKA is a modern freelancing platform connecting top freelancers with innovative businesses through a professional bidding system.",
      },
      { property: "og:title", content: "ERUKA — Where Talent Meets Opportunity" },
      {
        property: "og:description",
        content: "Find top freelancers or land your next project on ERUKA.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [, setTick] = useState(0);
  const routerState = useRouterState();

  useEffect(() => {
    function onAuth() {
      // force a root re-render so all children re-read getCurrentUser()
      setTick((t) => t + 1);
    }
    window.addEventListener("eruka:auth-changed", onAuth);
    return () => window.removeEventListener("eruka:auth-changed", onAuth);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("eruka_build");
      const reloadedFlag = window.sessionStorage.getItem("eruka_reloaded_once");
      if (stored && stored !== BUILD_COMMIT && !reloadedFlag) {
        // another user agent or older assets were loaded previously — update and reload once
        window.localStorage.setItem("eruka_build", BUILD_COMMIT);
        // set a session flag so we only reload once per tab
        window.sessionStorage.setItem("eruka_reloaded_once", "1");
        // reload to fetch latest assets
        window.location.reload();
      } else if (!stored) {
        window.localStorage.setItem("eruka_build", BUILD_COMMIT);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <SplashScreen>
      <div className="flex min-h-screen flex-col relative selection:bg-primary/20 selection:text-primary w-full h-full">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={routerState.location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
        <SupportChatWidget />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </SplashScreen>
  );
}
