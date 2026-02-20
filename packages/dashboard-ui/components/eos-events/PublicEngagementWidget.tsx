"use client";

import React, { useEffect, useState } from "react";
import { publicEngagementApi, Poll } from "@/lib/eos-engagement-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Star,
  MessageSquare,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PublicEngagementWidgetProps {
  eventId: string;
  targetId: string;
  targetType: "event" | "exhibitor" | "speaker";
  contactId?: string;
}

export function PublicEngagementWidget({
  eventId,
  targetId,
  targetType,
  contactId,
}: PublicEngagementWidgetProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [submittedFeedback, setSubmittedFeedback] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const data = await publicEngagementApi.getActivePolls(
          targetType,
          targetId,
        );
        setPolls(data);
      } catch (e) {
        console.error("Failed to load polls", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, [targetId, targetType]);

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await publicEngagementApi.respondToPoll(optionId, contactId);
      setVotedPolls((prev) => new Set([...prev, pollId]));
      toast.success("Vote recorded! Thank you for participating.");
    } catch (e) {
      toast.error("Failed to record vote");
    }
  };

  const handleSubmitFeedback = async () => {
    setSubmittingFeedback(true);
    try {
      await publicEngagementApi.submitFeedback({
        eventId,
        targetId,
        targetType,
        contactId,
        rating: feedback.rating,
        comment: feedback.comment,
      });
      setSubmittedFeedback(true);
      toast.success("Feedback submitted! We appreciate your input.");
    } catch (e) {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Polls */}
      {polls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Live Polls
            </h3>
          </div>
          {polls.map((poll) => (
            <Card
              key={poll.id}
              className="overflow-hidden border-primary/20 shadow-sm"
            >
              <CardHeader className="bg-primary/5 pb-3">
                <CardTitle className="text-base">{poll.question}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {votedPolls.has(poll.id) ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <p className="text-sm font-medium">Thanks for voting!</p>
                  </div>
                ) : (
                  <RadioGroup
                    onValueChange={(val) => handleVote(poll.id, val)}
                    className="space-y-3"
                  >
                    {poll.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label
                          htmlFor={option.id}
                          className="flex-1 cursor-pointer font-medium"
                        >
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feedback Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Session Feedback
          </h3>
        </div>
        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-6">
            {submittedFeedback ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-bold">Feedback Sent!</h4>
                <p className="text-sm text-muted-foreground">
                  Your input helps us improve the event experience.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label className="text-center block">
                    How would you rate this experience?
                  </Label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFeedback({ ...feedback, rating: s })}
                        className="transition-transform active:scale-90"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            s <= feedback.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-2 text-[10px] text-muted-foreground font-medium uppercase">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Comments (Optional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Share your thoughts or questions..."
                    value={feedback.comment}
                    onChange={(e) =>
                      setFeedback({ ...feedback, comment: e.target.value })
                    }
                    className="min-h-[100px] bg-muted/30"
                  />
                </div>

                <Button
                  className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-4">
        <Badge variant="outline" className="text-[10px] font-medium opacity-50">
          POWERED BY CHATNATION EOS
        </Badge>
      </div>
    </div>
  );
}
