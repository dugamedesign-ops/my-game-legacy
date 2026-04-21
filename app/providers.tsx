"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { AuthProvider } from "@/providers/AuthProvider";
import { captureClientError } from "@/lib/error-monitoring";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    function handleGlobalError(event: ErrorEvent) {
      captureClientError({
        message: event.message || "Unhandled runtime error",
        source: "window.error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "Unknown promise rejection");
      captureClientError({
        message: reason,
        source: "window.unhandledrejection",
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
      });
    }

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
