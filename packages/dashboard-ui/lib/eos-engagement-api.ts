import { fetchWithAuth } from "./api";

export interface PollOption {
  id: string;
  text: string;
  responses?: any[];
  count?: number;
}

export interface Poll {
  id: string;
  question: string;
  isActive: boolean;
  options: PollOption[];
  ownerType: "event" | "exhibitor" | "speaker";
  ownerId: string;
  createdAt: string;
  results?: { id: string; text: string; count: number }[];
}

export interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface EngagementStats {
  totalFeedback: number;
  averageRating: number;
  feedbacks: Feedback[];
}

export const engagementApi = {
  createPoll: (
    eventId: string,
    data: {
      ownerId: string;
      ownerType: string;
      question: string;
      options: string[];
    },
  ) =>
    fetchWithAuth<Poll>(`/eos/events/${eventId}/engagement/polls`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPolls: (eventId: string, ownerType: string, ownerId: string) =>
    fetchWithAuth<Poll[]>(
      `/eos/events/${eventId}/engagement/polls/${ownerType}/${ownerId}`,
    ),

  getPollResults: (eventId: string, pollId: string) =>
    fetchWithAuth<{
      id: string;
      question: string;
      results: { id: string; text: string; count: number }[];
    }>(`/eos/events/${eventId}/engagement/polls/${pollId}/results`),

  deactivatePoll: (eventId: string, pollId: string) =>
    fetchWithAuth<{ success: boolean }>(
      `/eos/events/${eventId}/engagement/polls/${pollId}/deactivate`,
      {
        method: "PATCH",
      },
    ),

  getFeedbackStats: (eventId: string, targetType: string, targetId: string) =>
    fetchWithAuth<EngagementStats>(
      `/eos/events/${eventId}/engagement/feedback/${targetType}/${targetId}/stats`,
    ),
};

export const publicEngagementApi = {
  getActivePolls: (ownerType: string, ownerId: string) =>
    fetchWithAuth<Poll[]>(
      `/eos/public/engagement/polls/active/${ownerType}/${ownerId}`,
    ),

  respondToPoll: (optionId: string, contactId?: string) =>
    fetchWithAuth<any>(`/eos/public/engagement/polls/respond/${optionId}`, {
      method: "POST",
      body: JSON.stringify({ contactId }),
    }),

  submitFeedback: (data: {
    eventId: string;
    targetId: string;
    targetType: string;
    contactId?: string;
    rating: number;
    comment?: string;
  }) =>
    fetchWithAuth<any>(`/eos/public/engagement/feedback/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
