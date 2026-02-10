/**
 * Post-signup 2FA setup page.
 * Users must add and verify a phone number for 2FA before accessing the dashboard.
 * Flow: enter phone → receive OTP via WhatsApp → verify OTP → redirect to dashboard.
 * Supports changing phone number and resending codes with cooldown.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { sendSetupCodeAction, verifySetupCodeAction } from "./actions";

/** Steps in the 2FA setup flow */
type SetupStep = "phone" | "verify";

export default function Setup2FaPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState<SetupStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If user already has 2FA enabled, skip to dashboard
  useEffect(() => {
    if (user && user.twoFactorSetupRequired !== true) {
      router.replace("/agent-inbox");
    }
  }, [user, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  /**
   * Submit phone number to receive an OTP via WhatsApp.
   * Validates phone format before calling the backend.
   */
  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, "").trim();
    if (digits.length < 10 || digits.length > 15) {
      setError("Enter a valid phone number (10–15 digits).");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await sendSetupCodeAction(digits);
      if (!result.success || !result.token) {
        throw new Error(result.error || "Failed to send code");
      }
      setToken(result.token);
      setStep("verify");
      setCode("");
      setResendCooldown(60);
      toast.success("Code sent to your WhatsApp!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send code";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify the OTP code and enable 2FA.
   * On success, refreshes user profile and redirects to dashboard.
   */
  const handleVerifyCode = async () => {
    if (!token) return;
    const digits = phone.replace(/\D/g, "").trim();

    setIsLoading(true);
    setError(null);
    try {
      const result = await verifySetupCodeAction(token, code, digits);
      if (!result.success) {
        throw new Error(result.error || "Verification failed");
      }
      toast.success("2FA is now enabled!");
      await refreshUser();
      router.push("/agent-inbox");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resend the OTP code to the same phone number.
   * Starts a new 60-second cooldown.
   */
  const handleResend = async () => {
    const digits = phone.replace(/\D/g, "").trim();
    setIsLoading(true);
    setError(null);
    try {
      const result = await sendSetupCodeAction(digits);
      if (!result.success || !result.token) {
        throw new Error(result.error || "Failed to resend code");
      }
      setToken(result.token);
      setCode("");
      setResendCooldown(60);
      toast.success("New code sent to your WhatsApp!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Go back to phone entry step to change the number.
   */
  const handleChangeNumber = () => {
    setStep("phone");
    setToken(null);
    setCode("");
    setError(null);
  };

  // ─── Step 1: Enter phone number ──────────────────────────────────────
  if (step === "phone") {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Set up two-factor authentication
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your WhatsApp phone number. We&apos;ll send a 6-digit code to
          verify it. 2FA keeps your account secure.
        </p>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="setup-phone"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              WhatsApp phone number
            </label>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Digits only, e.g. 254712345678
            </p>
            <div className="mt-1">
              <input
                id="setup-phone"
                type="tel"
                inputMode="numeric"
                placeholder="254712345678"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3 font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={isLoading || phone.replace(/\D/g, "").length < 10}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Sending code..." : "Send verification code"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Verify OTP code ─────────────────────────────────────────
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Enter verification code
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        We sent a 6-digit code to your WhatsApp number ending in{" "}
        <span className="font-mono font-medium">
          {phone.slice(-4)}
        </span>
        .
      </p>

      <div className="mt-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="setup-code"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Code
          </label>
          <div className="mt-1">
            <input
              id="setup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3 text-center text-lg tracking-widest"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleVerifyCode}
          disabled={isLoading || code.length !== 6}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Verifying..." : "Verify & continue"}
        </button>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={resendCooldown > 0 || isLoading}
            onClick={handleResend}
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </button>
          <button
            type="button"
            onClick={handleChangeNumber}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Change phone number
          </button>
        </div>
      </div>
    </div>
  );
}
