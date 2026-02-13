"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Loader2, User, Mail, Phone, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await authClient.updateProfile({ name });
      await refreshUser();
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your visible profile details within the organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  className="max-w-md"
                />
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleSaveName} 
                      disabled={isLoading || !name.trim()}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsEditing(false);
                        setName(user.name || "");
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 p-2 rounded-md max-w-md border">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed directly. Contact your admin for assistance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security & 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Security & Authentication
            </CardTitle>
            <CardDescription>
              Manage your two-factor authentication and security preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link 
              href="/settings/security" 
              className="block group"
            >
              <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Two-Factor Authentication (2FA)
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Manage your phone number and 2FA settings
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
