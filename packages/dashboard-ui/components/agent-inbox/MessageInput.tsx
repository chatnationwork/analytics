"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { AttachmentMenu } from "./AttachmentMenu";
import type { SendMessagePayload } from "@/lib/api/agent";

interface MessageInputProps {
  onSendMessage: (payload: string | SendMessagePayload) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendText = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(content.trim());
      setContent("");
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAttachment = async (payload: SendMessagePayload) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await onSendMessage(payload);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="p-3 border-t bg-background flex gap-2 items-end">
      <AttachmentMenu
        onSend={handleSendAttachment}
        disabled={disabled || isSending}
      />
      <textarea
        ref={textareaRef}
        className="flex min-h-[44px] flex-1 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        placeholder="Type a message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSending}
        rows={1}
      />
      <Button
        type="button"
        onClick={handleSendText}
        disabled={!content.trim() || disabled || isSending}
        size="icon"
        className="h-[44px] w-[44px] shrink-0 rounded-lg"
      >
        <SendHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}
