"use client";

import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, User } from "lucide-react";
import { agentApi, type ContactProfile } from "@/lib/api/agent";
import { useQuery } from "@tanstack/react-query";


// Define the shape of a contact to be sent
export interface ContactToSend {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone?: string;
    type?: "HOME" | "WORK" | "CELL" | "MAIN" | "IPHONE" | "HOME_FAX" | "WORK_FAX" | "PAGER";
    wa_id?: string;
  }>;
  emails?: Array<{ email?: string; type?: "HOME" | "WORK" }>;
  org?: {
    company?: string;
    department?: string;
    title?: string;
  };
  urls?: Array<{ url?: string; type?: "HOME" | "WORK" }>;
}

interface ContactPickerProps {
  onSelect: (contact: ContactToSend) => void;
  onCancel: () => void;
}

export function ContactPicker({ onSelect, onCancel }: ContactPickerProps) {
  return (
    <Tabs defaultValue="existing" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="existing">Select Existing</TabsTrigger>
        <TabsTrigger value="new">New Contact</TabsTrigger>
      </TabsList>
      <TabsContent value="existing">
        <ExistingContactSearch onSelect={onSelect} />
      </TabsContent>
      <TabsContent value="new">
        <ManualContactForm onSelect={onSelect} />
      </TabsContent>
    </Tabs>
  );
}

function ExistingContactSearch({ onSelect }: { onSelect: (c: ContactToSend) => void }) {
  const [search, setSearch] = useState("");
  // Simple debounce logic if hook doesn't exist
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["agent-contacts-search", debouncedSearch],
    queryFn: () => agentApi.searchContacts(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const handleSelect = (profile: ContactProfile) => {
    // Map profile to ContactToSend
    const contact: ContactToSend = {
      name: {
        formatted_name: profile.name || "Unknown",
        first_name: profile.name?.split(" ")[0] || "Unknown",
        last_name: profile.name?.split(" ").slice(1).join(" "),
      },
      phones: [{
        phone: profile.contactId, // Assuming contactId is phone
        type: "CELL",
        wa_id: profile.contactId,
      }],
    };
    if (profile.email) {
      contact.emails = [{ email: profile.email, type: "WORK" }];
    }
    onSelect(contact);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-2">
        <Search className="h-4 w-4 text-muted-foreground self-center" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="h-[200px] overflow-y-auto border rounded-md p-2 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground text-center">Searching...</p>}
        {!isLoading && debouncedSearch.length < 2 && (
          <p className="text-sm text-muted-foreground text-center">Type at least 2 characters to search</p>
        )}
        {!isLoading && contacts?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">No contacts found</p>
        )}
        {contacts?.map((c) => (
          <button
            key={c.contactId}
            onClick={() => handleSelect(c)}
            className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{c.name || "Unknown"}</div>
              <div className="text-xs text-muted-foreground truncate">{c.contactId}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ManualContactForm({ onSelect }: { onSelect: (c: ContactToSend) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName && !phone) return;

    const contact: ContactToSend = {
      name: {
        formatted_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
      phones: phone ? [{ phone, type: "CELL" }] : undefined,
      emails: email ? [{ email, type: "WORK" }] : undefined,
      org: org ? { company: org } : undefined,
    };
    onSelect(contact);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1234567890"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="org">Company</Label>
        <Input
          id="org"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder="Acme Inc."
        />
      </div>
      <Button type="submit" className="w-full" disabled={!firstName && !phone}>
        Send Contact
      </Button>
    </form>
  );
}
