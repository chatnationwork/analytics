import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EosEvent } from "../../types/eos-events";

interface EventCardProps {
  event: EosEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isPublished = event.status === "published";

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold">{event.name}</CardTitle>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2">
          {new Date(event.startsAt).toLocaleDateString()} -{" "}
          {new Date(event.endsAt).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-600 line-clamp-2">
          {event.description || "No description provided."}
        </p>
        {event.venueName && (
          <p className="text-xs text-gray-400 mt-2">📍 {event.venueName}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Link href={`/eos-events/${event.id}`}>
          <Button variant="outline">Manage</Button>
        </Link>
        {!isPublished && (
          <Link href={`/eos-events/${event.id}/publish`}>
            <Button>Publish</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};
