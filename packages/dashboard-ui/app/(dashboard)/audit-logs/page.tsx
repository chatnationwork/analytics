"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuditLogs, type AuditLogEntry } from "@/lib/audit-api";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { ShieldCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "auth.login", label: "Login" },
  { value: "auth.login_failure", label: "Login failure" },
  { value: "config.team.created", label: "Team created" },
  { value: "config.team.updated", label: "Team updated" },
  { value: "config.team.deleted", label: "Team deleted" },
  { value: "config.team.disabled", label: "Team disabled" },
  { value: "config.team.enabled", label: "Team enabled" },
  { value: "chat.session.assigned", label: "Chat assigned" },
  { value: "chat.session.resolved", label: "Chat resolved" },
  { value: "chat.session.transferred", label: "Chat transferred" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function DetailsCell({ details }: { details: Record<string, unknown> | null }) {
  if (!details || Object.keys(details).length === 0)
    return <span className="text-muted-foreground">—</span>;
  const str = JSON.stringify(details);
  const short = str.length > 60 ? str.slice(0, 60) + "…" : str;
  return (
    <span
      title={str}
      className="font-mono text-xs text-muted-foreground truncate max-w-[200px] inline-block"
    >
      {short}
    </span>
  );
}

export default function AuditLogsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [action, setAction] = useState("all");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "audit-logs",
      startDate || undefined,
      endDate || undefined,
      action || undefined,
      actorId || undefined,
      page,
      limit,
    ],
    queryFn: () =>
      getAuditLogs({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        action: action && action !== "all" ? action : undefined,
        actorId: actorId.trim() || undefined,
        page,
        limit,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Audit logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide audit trail: logins, config changes, and chat lifecycle
            events.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <div className="flex flex-wrap gap-3 items-end pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-[160px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-[160px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Action</label>
                <Select
                  value={action}
                  onValueChange={(v) => {
                    setAction(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Actor ID
                </label>
                <Input
                  placeholder="User ID"
                  value={actorId}
                  onChange={(e) => setActorId(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (setPage(1), refetch())
                  }
                  className="w-[180px]"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                <Search className="h-4 w-4 mr-1" /> Apply
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-4">
                {(error as Error).message}
              </div>
            )}

            {isLoading && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Loading…
              </div>
            )}

            {data &&
              !isLoading &&
              (() => {
                const rows = Array.isArray(data.data) ? data.data : [];
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-muted-foreground py-8"
                            >
                              No audit entries match your filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          rows.map((row: AuditLogEntry) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDate(row.createdAt)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {row.action}
                              </TableCell>
                              <TableCell>
                                <span className="text-muted-foreground">
                                  {row.actorType}
                                </span>
                                {row.actorId && (
                                  <span className="ml-1 font-mono text-xs">
                                    {row.actorId.slice(0, 8)}…
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {row.resourceType && (
                                  <span className="text-muted-foreground">
                                    {row.resourceType}
                                  </span>
                                )}
                                {row.resourceId && (
                                  <span
                                    className="ml-1 font-mono text-xs truncate max-w-[120px] inline-block"
                                    title={row.resourceId}
                                  >
                                    {row.resourceId.slice(0, 8)}…
                                  </span>
                                )}
                                {!row.resourceType && !row.resourceId && "—"}
                              </TableCell>
                              <TableCell>
                                <DetailsCell details={row.details} />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {row.ip ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {(data.total ?? 0) > 0 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                        <p className="text-sm text-muted-foreground">
                          {Array.isArray(data.data) ? data.data.length : 0} of{" "}
                          {data.total} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!hasPrev}
                            onClick={() => setPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages || 1}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!hasNext}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
