"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../login/actions";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const result = await forgotPasswordAction(email.trim());
      if (result.success) {
        setSent(true);
        toast.success(
          "If an account exists, we sent a reset link to your email.",
        );
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          If an account exists for <strong>{email}</strong>, we sent a link to
          reset your password. The link expires in 24 hours.
        </p>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <Link
            href="/login"
            className="font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Forgot your password?
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50 transition-colors"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <Link
            href="/login"
            className="py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
