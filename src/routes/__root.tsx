import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { QueenStoreProvider } from "../lib/queen-store";
import { AuthProvider } from "../lib/auth-store";
import { NotificationsProvider } from "../lib/notifications-store";
import { LivekitProvider } from "../lib/livekit-provider";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/executive.roadmap") {
      throw redirect({
        to: "/stakeholder-roadmap",
      });
    }
    if (location.pathname === "/executive.reports") {
      throw redirect({
        to: "/stakeholder-reports",
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Queen PM" },
      { name: "description", content: "Queen PM" },
      { name: "author", content: "Queen PM" },
      { property: "og:title", content: "Queen PM" },
      { property: "og:description", content: "Queen PM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@QueenPM" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="currentColor" fill-rule="evenodd" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 8,12 A 2,2 0 1 1  4,12 A 2,2 0 1 1  8,12 M 24.5,7.5 A 2,2 0 1 1  20.5,7.5 A 2,2 0 1 1  24.5,7.5 M 41,12 A 2,2 0 1 1  37,12 A 2,2 0 1 1  41,12 M 10.5,20 A 2,2 0 1 1  6.5,20 A 2,2 0 1 1  10.5,20 M 38.5,20 A 2,2 0 1 1  34.5,20 A 2,2 0 1 1  38.5,20" /><path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 24.5,10 L 18,25 L 10.5,13.5 L 9,26 z" /><path d="M 9,26 C 9,28 10.5,30 12.5,30 L 32.5,30 C 34.5,30 36,28 36,26" /><path d="M 11,14 L 33,14" /><path d="M 12.5,30 L 32.5,30 L 32.5,37.5 L 12.5,37.5 z" /><path d="M 11.5,37.5 L 33.5,37.5" /></g></svg>',
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <LivekitProvider>
            <QueenStoreProvider>
              <Outlet />
              <Toaster position="top-right" richColors theme="dark" />
            </QueenStoreProvider>
          </LivekitProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
