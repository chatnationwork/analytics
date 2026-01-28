"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { loginAction } from "./actions";
import { useAuth } from "@/components/auth/AuthProvider";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Get user-friendly message for logout reason */
function getReasonMessage(reason: string | null): string | null {
  switch (reason) {
    case "expired":
      return "Your session has expired. Please sign in again.";
    case "revoked":
      return "Your session was revoked. Please sign in again.";
    case "idle":
      return "You were logged out due to inactivity.";
    default:
      return null;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get logout reason from URL params
  const reason = searchParams.get("reason");
  const reasonMessage = getReasonMessage(reason);

  // Clear the auth redirect marker on login page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_redirect_time");
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Server Action (Cookie)
      const result = await loginAction(data.email, data.password);

      if (!result.success || !result.token || !result.user) {
        throw new Error(result.error || "Login failed");
      }

      // Update AuthProvider state with the user (includes permissions)
      // This ensures navigation shows correct permissions immediately
      login(result.token, result.user);

      toast.success("Welcome back!");
      router.push("/overview");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Sign in to your account
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Or{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          create a new account
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        {reasonMessage && (
          <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            {reasonMessage}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                type="email"
                {...register("email")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                type="password"
                {...register("password")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}
