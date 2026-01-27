import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(content);
      setContent("");
      // Focus back on input
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t bg-background flex gap-2 items-end">
        <textarea
            ref={textareaRef}
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
        />
        <Button 
            onClick={handleSend} 
            disabled={!content.trim() || disabled || isSending}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
        >
            <SendHorizontal className="h-5 w-5" />
        </Button>
    </div>
  );
}
