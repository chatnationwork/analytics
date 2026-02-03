"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { settingsApi } from "@/lib/settings-api";
import { Plus, Copy, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["write", "read"]),
});

type FormData = z.infer<typeof formSchema>;

interface ApiKeySettingsProps {
  tenantId?: string;
}

export function ApiKeySettings({ tenantId }: ApiKeySettingsProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: settingsApi.getApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: settingsApi.generateApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API Key generated successfully");
      setNewKey(data.key);
      setIsAdding(false);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: settingsApi.deactivateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate API key");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "write",
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
            API Keys
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage API keys for SDK integration (Write) or API access (Read).
          </p>
        </div>
        {!isAdding && !newKey && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-md hover:bg-[var(--primary-dark)] transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Generate Key
          </button>
        )}
      </div>

      {tenantId && (
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Organization ID
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Use this ID when configuring the Handover Webhook or identifying
            your workspace.
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-secondary px-3 py-2 rounded text-sm font-mono text-foreground border border-border">
              {tenantId}
            </code>
            <button
              onClick={() => copyToClipboard(tenantId)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Copy Organization ID"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}

      {newKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium text-green-900 dark:text-green-300 mb-2">
            Key Generated Successfully!
          </h4>
          <p className="text-sm text-green-700 dark:text-green-400 mb-4">
            Please copy this key immediately. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-black p-3 rounded border border-green-300 dark:border-green-800 font-mono text-sm break-all">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey)}
              className="p-3 bg-white dark:bg-black border border-green-300 dark:border-green-800 rounded hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors"
              title="Copy"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setNewKey(null)}
              className="text-sm text-green-700 dark:text-green-400 font-medium hover:underline"
            >
              Done, I have saved it
            </button>
          </div>
        </div>
      )}

      {isAdding && !newKey && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-base font-medium mb-4 dark:text-white">
            Generate New Key
          </h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Website SDK"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                {...register("type")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--primary)] focus:ring-[var(--primary)] dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3"
              >
                <option value="write">Write (SDK Event Tracking)</option>
                <option value="read">Read (API Access)</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  reset();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {isSubmitting ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {keys?.map((key) => (
                <tr key={key.id} className={!key.isActive ? "opacity-60" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                    {key.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500 dark:text-gray-400">
                    {key.keyPrefix}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        key.type === "write"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}
                    >
                      {key.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        key.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {key.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {key.isActive ? (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Deactivate this API key? It will stop working immediately. You can still see it in the list as deactivated.",
                            )
                          ) {
                            deactivateMutation.mutate(key.id);
                          }
                        }}
                        className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                        title="Deactivate"
                        disabled={deactivateMutation.isPending}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {keys?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No keys found. Generate one to integrate SDKs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
