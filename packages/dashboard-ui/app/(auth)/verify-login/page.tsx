"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifySessionTakeoverAction } from "../login/actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function VerifyLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Invalid link. Please sign in again.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await verifySessionTakeoverAction({ token });
      if (cancelled) return;
      if (!result.success || !result.token || !result.user) {
        setError(
          result.error ?? "Invalid or expired link. Please sign in again.",
        );
        setStatus("error");
        return;
      }
      login(result.token, result.user);
      toast.success("Welcome back! Your other session was signed out.");
      setStatus("success");
      router.replace("/agent-inbox");
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, login, router]);

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Verifying your login...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Verification failed
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return null;
}

export default function VerifyLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      }
    >
      <VerifyLoginContent />
    </Suspense>
  );
}
