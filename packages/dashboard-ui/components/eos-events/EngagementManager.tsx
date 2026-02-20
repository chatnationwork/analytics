"use client";

import React, { useEffect, useState } from "react";
import { engagementApi, Poll, EngagementStats } from "@/lib/eos-engagement-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  BarChart2,
  Star,
  MessageSquare,
  Trash2,
  StopCircle,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface EngagementManagerProps {
  eventId: string;
  ownerId: string;
  ownerType: "event" | "exhibitor" | "speaker";
}

export function EngagementManager({
  eventId,
  ownerId,
  ownerType,
}: EngagementManagerProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pollsData, statsData] = await Promise.all([
        engagementApi.getPolls(eventId, ownerType, ownerId),
        engagementApi.getFeedbackStats(eventId, ownerType, ownerId),
      ]);
      setPolls(pollsData);
      setStats(statsData);
    } catch (e) {
      console.error("Failed to load engagement data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, ownerId, ownerType]);

  const handleCreatePoll = async () => {
    if (!newPoll.question || newPoll.options.some((o) => !o)) {
      toast.error("Please fill in the question and all options");
      return;
    }
    try {
      await engagementApi.createPoll(eventId, {
        ownerId,
        ownerType,
        question: newPoll.question,
        options: newPoll.options,
      });
      toast.success("Poll created successfully");
      setIsPollDialogOpen(false);
      setNewPoll({ question: "", options: ["", ""] });
      loadData();
    } catch (e) {
      toast.error("Failed to create poll");
    }
  };

  const handleDeactivatePoll = async (pollId: string) => {
    try {
      await engagementApi.deactivatePoll(eventId, pollId);
      toast.success("Poll deactivated");
      loadData();
    } catch (e) {
      toast.error("Failed to deactivate poll");
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const engagementUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/eos/public/engage/${ownerType}/${ownerId}`
      : "";

  const copyLink = () => {
    navigator.clipboard.writeText(engagementUrl);
    toast.success("Engagement link copied to clipboard!");
  };

  const getTotalVotes = (poll: Poll) => {
    return (poll.options || []).reduce(
      (acc, opt) => acc + (opt.responses?.length || 0),
      0,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <div className="space-y-1">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Live engagement link
          </h4>
          <p className="text-xs text-muted-foreground">
            Share this link or use it in a QR code for attendees to interact.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="gap-2"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href={engagementUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> View Live
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="polls">
        <TabsList>
          <TabsTrigger value="polls">
            <BarChart2 className="w-4 h-4 mr-2" /> Polls
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="w-4 h-4 mr-2" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="polls" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Interative Polls</h3>
            <Button size="sm" onClick={() => setIsPollDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Poll
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {polls.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                No polls created yet.
              </p>
            ) : (
              polls.map((poll) => (
                <Card key={poll.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-bold">
                        {poll.question}
                      </CardTitle>
                      <Badge variant={poll.isActive ? "default" : "secondary"}>
                        {poll.isActive ? "Active" : "Completed"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Created {new Date(poll.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {poll.options.map((option) => {
                        const total = getTotalVotes(poll);
                        const count = option.responses?.length || 0;
                        const percent = total > 0 ? (count / total) * 100 : 0;

                        return (
                          <div key={option.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{option.text}</span>
                              <span>{count} votes</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {poll.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => handleDeactivatePoll(poll.id)}
                      >
                        <StopCircle className="w-4 h-4 mr-2" /> End Poll
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Feedback</CardTitle>
              <CardDescription>
                Average rating and recent reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl font-bold">
                  {stats?.averageRating || 0}
                </div>
                <div className="flex flex-col">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${s <= (stats?.averageRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats?.totalFeedback || 0} reviews
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {stats?.feedbacks && stats.feedbacks.length > 0 ? (
                  stats.feedbacks.map((f) => (
                    <div key={f.id} className="border-t pt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= f.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {f.comment && <p className="text-sm">{f.comment}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm py-4">
                    No feedback received yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                placeholder="What is your favorite part of this event?"
                value={newPoll.question}
                onChange={(e) =>
                  setNewPoll({ ...newPoll, question: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {newPoll.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newPoll.options];
                      opts[i] = e.target.value;
                      setNewPoll({ ...newPoll, options: opts });
                    }}
                  />
                  {newPoll.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const opts = newPoll.options.filter(
                          (_, idx) => idx !== i,
                        );
                        setNewPoll({ ...newPoll, options: opts });
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {newPoll.options.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setNewPoll({
                      ...newPoll,
                      options: [...newPoll.options, ""],
                    })
                  }
                >
                  Add Option
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsPollDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePoll}>Create Poll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
