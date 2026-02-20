"use client";

import React, { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface WhatsAppAlert {
  id: string;
  name: string;
  healthStatus: "healthy" | "auth_error" | "rate_limited";
  lastError: string | null;
  authStatusLastChecked: string | null;
  isActive: boolean;
}

export function WhatsAppHealthAlerts() {
  const [alerts, setAlerts] = useState<WhatsAppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const data = await fetchWithAuth<WhatsAppAlert[]>("/whatsapp/alerts");
      setAlerts(data || []);
    } catch (error) {
      console.error("Failed to fetch WhatsApp health alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={
            alert.healthStatus === "auth_error" ? "destructive" : "warning"
          }
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>
              WhatsApp Integration Issue: <strong>{alert.name}</strong>
            </span>
            {alert.healthStatus === "auth_error" && (
              <Button
                variant="outline"
                size="sm"
                className="ml-4 h-7 text-xs bg-white dark:bg-black"
                onClick={() => (window.location.href = "/settings/crm")}
              >
                Reconnect
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            {alert.healthStatus === "auth_error" ? (
              <p>
                The integration has been deactivated due to an authentication
                failure. Please reconnect to restore WhatsApp functionality.
              </p>
            ) : (
              <p>
                The integration is currently rate-limited by Meta. Some messages
                may be delayed.
              </p>
            )}
            {alert.lastError && (
              <p className="mt-2 text-xs opacity-80 font-mono">
                Error: {alert.lastError}
              </p>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
