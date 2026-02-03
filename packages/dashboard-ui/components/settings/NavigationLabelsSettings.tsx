"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NAV_ENTRIES } from "@/lib/nav-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function NavigationLabelsSettings() {
  const queryClient = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const navLabels = tenant?.settings?.navLabels ?? {};
    const next: Record<string, string> = {};
    for (const { href, defaultLabel } of NAV_ENTRIES) {
      next[href] = navLabels[href] ?? defaultLabel;
    }
    setLabels(next);
  }, [tenant?.settings?.navLabels]);

  const updateTenant = useMutation({
    mutationFn: (settings: { navLabels: Record<string, string> }) =>
      api.updateTenantSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleChange = (href: string, value: string) => {
    setLabels((prev) => ({ ...prev, [href]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTenant.mutateAsync({ navLabels: labels });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (href: string) => {
    const entry = NAV_ENTRIES.find((e) => e.href === href);
    if (entry) setLabels((prev) => ({ ...prev, [href]: entry.defaultLabel }));
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customise the sidebar labels to match your organisation. Changes apply
        across the app.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Route</TableHead>
            <TableHead>Label</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {NAV_ENTRIES.map(({ href, defaultLabel }) => (
            <TableRow key={href}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {href}
              </TableCell>
              <TableCell>
                <Input
                  value={labels[href] ?? defaultLabel}
                  onChange={(e) => handleChange(href, e.target.value)}
                  className="max-w-sm"
                  aria-label={`Label for ${href}`}
                />
              </TableCell>
              <TableCell>
                {labels[href] !== defaultLabel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(href)}
                  >
                    Reset
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || updateTenant.isPending}
        >
          {saving || updateTenant.isPending ? "Saving…" : "Save"}
        </Button>
        {success && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Saved.
          </span>
        )}
        {updateTenant.isError && (
          <span className="text-sm text-destructive">
            Failed to save. Try again.
          </span>
        )}
      </div>
    </div>
  );
}
