"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, X, Search, User } from "lucide-react";
import { agentApi, AvailableAgent } from "@/lib/api/agent";

interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (targetAgentId: string, reason?: string) => Promise<void>;
  contactName?: string;
  /** When set, show "Transfer N chats" (bulk transfer mode). */
  sessionCount?: number;
  /** When true, user must provide a transfer reason (organization setting). */
  reasonRequired?: boolean;
}

export function TransferDialog({
  isOpen,
  onClose,
  onTransfer,
  contactName,
  sessionCount,
  reasonRequired = false,
}: TransferDialogProps) {
  const [agents, setAgents] = useState<AvailableAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const data = await agentApi.getAvailableAgents();
      setAgents(data);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    if (reasonRequired && !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onTransfer(selectedAgentId, reason || undefined);
      setSelectedAgentId("");
      setReason("");
      setSearchQuery("");
      onClose();
    } catch (error) {
      console.error("Failed to transfer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-foreground">
              {sessionCount != null && sessionCount > 1
                ? `Transfer ${sessionCount} chats`
                : "Transfer Chat"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {contactName && sessionCount == null && (
          <p className="text-sm text-muted-foreground mb-4">
            Transferring chat with{" "}
            <span className="font-medium text-foreground">{contactName}</span>
          </p>
        )}
        {sessionCount != null && sessionCount > 1 && (
          <p className="text-sm text-muted-foreground mb-4">
            All selected chats will be transferred to the chosen agent.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Agents */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Agent <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Agent List */}
            <div className="max-h-48 overflow-y-auto border border-border rounded-md">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading agents...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? "No agents found" : "No available agents"}
                </div>
              ) : (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors ${
                      selectedAgentId === agent.id
                        ? "bg-primary/10 border-l-2 border-primary"
                        : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {agent.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {agent.email}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected Agent Display */}
          {selectedAgent && (
            <div className="p-3 bg-muted/50 rounded-md flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  Transferring to: {selectedAgent.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedAgent.email}
                </div>
              </div>
            </div>
          )}

          {/* Transfer Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason {reasonRequired ? <span className="text-red-500">*</span> : "(Optional)"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you transferring this chat?"
              rows={2}
              required={reasonRequired}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedAgentId ||
                isSubmitting ||
                (reasonRequired && !reason.trim())
              }
            >
              {isSubmitting
                ? "Transferring..."
                : sessionCount != null && sessionCount > 1
                  ? "Transfer chats"
                  : "Transfer Chat"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
