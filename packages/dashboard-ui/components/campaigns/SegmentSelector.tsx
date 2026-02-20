"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AudienceFilterBuilder } from "@/app/(dashboard)/broadcast/components/AudienceFilterBuilder";
import { segmentsApi, type ContactSegment } from "@/lib/segments-api";
import type { AudienceFilter } from "@/lib/broadcast-types";
import { Users, ExternalLink, Loader2 } from "lucide-react";

export interface SegmentSelectorProps {
  value: AudienceFilter;
  onChange: (filter: AudienceFilter) => void;
  onSegmentSelect?: (segmentId: string | null, filter: AudienceFilter) => void;
  segmentsLinkHref?: string;
}

export function SegmentSelector({
  value,
  onChange,
  onSegmentSelect,
  segmentsLinkHref = "/contacts?tab=segments",
}: SegmentSelectorProps) {
  const [segments, setSegments] = useState<ContactSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"saved" | "custom">("saved");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await segmentsApi.list();
        setSegments(data);
      } catch (err) {
        console.error("Failed to load segments:", err);
      } finally {
        setSegmentsLoading(false);
      }
    };
    load();
  }, []);

  const handleSegmentChange = (id: string) => {
    const segment = segments.find((s) => s.id === id);
    if (!segment) return;
    setSelectedSegmentId(segment.id);
    onChange(segment.filter);
    onSegmentSelect?.(segment.id, segment.filter);
  };

  const handleCustomFilterChange = (filter: AudienceFilter) => {
    setSelectedSegmentId(null);
    onChange(filter);
    onSegmentSelect?.(null, filter);
  };

  const handleTabChange = (v: string) => {
    setActiveTab(v as "saved" | "custom");
    if (v === "custom") {
      setSelectedSegmentId(null);
      onSegmentSelect?.(null, value);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="saved">Saved Segment</TabsTrigger>
          <TabsTrigger value="custom">Custom Filter</TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="space-y-4 mt-4">
          {segmentsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading segments...
            </div>
          ) : segments.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-sm">No segments yet.</p>
              <Link
                href={segmentsLinkHref}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Create your first segment <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select a segment</Label>
                <Select
                  value={selectedSegmentId ?? ""}
                  onValueChange={handleSegmentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{s.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {s.contactCount.toLocaleString()} contacts
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSegmentId && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  {segments.find((s) => s.id === selectedSegmentId)?.description && (
                    <p className="text-muted-foreground mb-1">
                      {segments.find((s) => s.id === selectedSegmentId)?.description}
                    </p>
                  )}
                  <p className="font-medium">
                    {segments.find((s) => s.id === selectedSegmentId)?.contactCount.toLocaleString()}{" "}
                    contacts match this segment
                  </p>
                </div>
              )}
              <Link
                href={segmentsLinkHref}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Manage segments <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <AudienceFilterBuilder value={value} onChange={handleCustomFilterChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
