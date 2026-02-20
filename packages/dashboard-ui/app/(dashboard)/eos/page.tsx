"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Store,
  Mic,
  ChevronRight,
  Activity,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function EosHubPage() {
  const modules = [
    {
      title: "Events",
      description: "Manage your event listings, schedules, and ticket types.",
      icon: Calendar,
      href: "/eos-events",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Exhibitors",
      description: "Onboard partners, assign booths, and manage brochures.",
      icon: Store,
      href: "/eos/exhibitor",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Speakers",
      description: "Coordinate talk titles, bios, and presentation materials.",
      icon: Mic,
      href: "/eos/speaker",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Lead Analytics",
      description: "View real-time lead capture stats from exhibitor booths.",
      icon: Activity,
      href: "/overview",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-4xl font-bold tracking-tight">EOS Platform Hub</h1>
        <p className="text-muted-foreground text-lg italic">
          Powering immersive event experiences and partner engagement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((module) => (
          <Link key={module.href} href={module.href}>
            <Card
              className="hover:shadow-md transition-all cursor-pointer border-l-4 group"
              style={{
                borderLeftColor: `var(--${module.color.split("-")[1]})`,
              }}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`p-3 rounded-lg ${module.bg} ${module.color}`}>
                  <module.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {module.title}
                  </CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-8 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-background border mb-2">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Invite Your Partners</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Each exhibitor and speaker gets a unique, secure portal link. No
            logins required—they just click and update their profiles.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/eos/exhibitor">
              <Button variant="outline">Invite Exhibitors</Button>
            </Link>
            <Link href="/eos/speaker">
              <Button variant="outline">Invite Speakers</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
