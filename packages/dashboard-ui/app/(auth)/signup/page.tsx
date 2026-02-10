"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signupAction } from "./actions";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordInput } from "@/components/ui/password-input";

const PASSWORD_MIN_LENGTH = 8;

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    )
    .refine(
      (p) => /[A-Z]/.test(p),
      "Password must contain at least one uppercase letter",
    )
    .refine(
      (p) => /[a-z]/.test(p),
      "Password must contain at least one lowercase letter",
    )
    .refine((p) => /\d/.test(p), "Password must contain at least one number")
    .refine(
      (p) => /[^A-Za-z0-9]/.test(p),
      "Password must contain at least one special character",
    ),
  organizationName: z.string().min(2, "Organization name is required"),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use Server Action to handle Signup + Cookie Logic
      const result = await signupAction(data);

      if (!result.success || !result.token || !result.user) {
        throw new Error(result.error || "Signup failed");
      }

      // Update AuthProvider state with the user (includes permissions)
      login(result.token, result.user);

      toast.success("Account created successfully!");
      router.push("/setup-2fa");
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
        Create a new account
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
        >
          Sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Full Name
            </label>
            <div className="mt-1">
              <input
                id="name"
                type="text"
                {...register("name")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Organization Name
            </label>
            <div className="mt-1">
              <input
                id="organizationName"
                type="text"
                {...register("organizationName")}
                placeholder="e.g. Acme Corp"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-800 dark:border-gray-700 dark:text-white py-2 px-3"
              />
              {errors.organizationName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.organizationName.message}
                </p>
              )}
            </div>
          </div>

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
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Minimum {PASSWORD_MIN_LENGTH} characters. Must include at least
              one: uppercase letter, lowercase letter, number, and special
              character.
            </p>
            <div className="mt-1">
              <PasswordInput
                id="password"
                {...register("password")}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
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
          {isLoading ? "Create account" : "Sign up"}
        </Button>
      </form>
    </div>
  );
}
