"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  loginAction,
  verify2FaAction,
  resend2FaAction,
  verifySessionTakeoverAction,
} from "./actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordInput } from "@/components/ui/password-input";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const verify2FaSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type Verify2FaFormData = z.infer<typeof verify2FaSchema>;

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
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [sessionVerification, setSessionVerification] = useState<{
    method: "2fa" | "email";
    requestId: string;
    maskedEmail?: string;
    maskedPhone?: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const reason = searchParams.get("reason");
  const reasonMessage = getReasonMessage(reason);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_redirect_time");
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const verifyForm = useForm<Verify2FaFormData>({
    resolver: zodResolver(verify2FaSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginAction(data.email, data.password);

      if (result.requiresTwoFactor && result.twoFactorToken) {
        setTwoFactorToken(result.twoFactorToken);
        setResendCooldown(60);
        toast.info("Enter the code sent to your WhatsApp");
        return;
      }

      if (
        result.requiresSessionVerification &&
        result.sessionVerificationRequestId
      ) {
        setSessionVerification({
          method:
            (result.sessionVerificationMethod as "2fa" | "email") ?? "email",
          requestId: result.sessionVerificationRequestId,
          maskedEmail: result.sessionVerificationMaskedEmail,
          maskedPhone: result.sessionVerificationMaskedPhone,
        });
        if (result.sessionVerificationMethod === "email") {
          const parts: string[] = [];
          if (result.sessionVerificationMaskedEmail) {
            parts.push(result.sessionVerificationMaskedEmail);
          }
          if (result.sessionVerificationMaskedPhone) {
            const last3 = result.sessionVerificationMaskedPhone.slice(-3);
            parts.push(`number ending ***${last3}`);
          }
          const dest =
            parts.length > 0 ? ` sent to ${parts.join(" and ")}` : "";
          toast.info(`Verification link${dest}. Check your inbox.`);
        } else {
          toast.info("Enter the code sent to your WhatsApp to sign in here.");
        }
        return;
      }

      if (result.requiresPasswordChange && result.changePasswordToken) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "changePasswordToken",
            result.changePasswordToken,
          );
        }
        toast.info("Your password has expired. Please set a new password.");
        router.push("/change-password");
        return;
      }

      if (!result.success || !result.token || !result.user) {
        throw new Error(result.error ?? "Login failed");
      }

      login(result.token, result.user);
      toast.success("Welcome back!");
      router.push("/agent-inbox");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (data: Verify2FaFormData) => {
    if (
      sessionVerification?.method === "2fa" &&
      sessionVerification?.requestId
    ) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await verifySessionTakeoverAction({
          requestId: sessionVerification.requestId,
          code: data.code,
        });
        if (!result.success || !result.token || !result.user) {
          throw new Error(result.error ?? "Invalid code");
        }
        login(result.token, result.user);
        toast.success("Welcome back! Your other session was signed out.");
        router.push("/agent-inbox");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid code";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!twoFactorToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await verify2FaAction(twoFactorToken, data.code);

      if (!result.success || !result.token || !result.user) {
        throw new Error(result.error ?? "Invalid code");
      }

      login(result.token, result.user);
      toast.success("Welcome back!");
      router.push("/agent-inbox");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid code";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionVerification?.method === "2fa") {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Verify your identity
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          You're signed in elsewhere. Enter the 6-digit code sent to your
          WhatsApp to sign in here. Your other session will be signed out.
        </p>

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="mt-8 space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Code
            </label>
            <div className="mt-1">
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                {...verifyForm.register("code")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3 text-center text-lg tracking-widest"
              />
              {verifyForm.formState.errors.code && (
                <p className="mt-1 text-sm text-red-600">
                  {verifyForm.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setSessionVerification(null);
              setError(null);
            }}
            className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  if (sessionVerification?.method === "email") {
    const destParts: string[] = [];
    if (sessionVerification.maskedEmail) {
      destParts.push(sessionVerification.maskedEmail);
    }
    if (sessionVerification.maskedPhone) {
      const last3 = sessionVerification.maskedPhone.slice(-3);
      destParts.push(`number ending ***${last3}`);
    }
    const destStr =
      destParts.length > 0 ? ` to ${destParts.join(" and ")}` : "";

    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          You're signed in elsewhere. We sent a verification link{destStr}.
          Click it to sign in here—your other session will be signed out.
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          The link expires in 15 minutes. Didn't get it? Check spam or try
          signing in again.
        </p>
        <button
          type="button"
          onClick={() => {
            setSessionVerification(null);
            setError(null);
          }}
          className="mt-6 w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (twoFactorToken) {
    return (
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Two-factor authentication
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter the 6-digit code sent to your WhatsApp.
        </p>

        <form
          onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
          className="mt-8 space-y-6"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Code
            </label>
            <div className="mt-1">
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                {...verifyForm.register("code")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3 text-center text-lg tracking-widest"
              />
              {verifyForm.formState.errors.code && (
                <p className="mt-1 text-sm text-red-600">
                  {verifyForm.formState.errors.code.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={resendCooldown > 0 || resending}
              onClick={async () => {
                if (!twoFactorToken) return;
                setResending(true);
                setError(null);
                try {
                  const result = await resend2FaAction(twoFactorToken);
                  if (result.success) {
                    setResendCooldown(60);
                    toast.success("New code sent to your WhatsApp");
                  } else {
                    setError(result.error ?? "Could not resend");
                    toast.error(result.error);
                  }
                } finally {
                  setResending(false);
                }
              }}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
            </button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTwoFactorToken(null);
                setError(null);
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Back to Login
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Sign in to your account
      </h2>
     

      <form
        onSubmit={loginForm.handleSubmit(onLoginSubmit)}
        className="mt-8 space-y-6"
      >
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
                {...loginForm.register("email")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
              >
                Forgot password?
              </Link>
            </div>
            <div className="mt-1">
              <PasswordInput
                id="password"
                {...loginForm.register("password")}
                autoComplete="current-password"
              />


              {loginForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
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
