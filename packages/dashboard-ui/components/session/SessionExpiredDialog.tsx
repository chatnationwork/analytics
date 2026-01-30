import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
export function SessionExpiredDialog({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("expired");

  useEffect(() => {
    const handleExpired = (event: Event) => {
      const customEvent = event as CustomEvent;
      setReason(customEvent.detail?.reason || "expired");
      setOpen(true);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const handleLogin = () => {
    setOpen(false);
    onLogout();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            {reason === 'revoked' 
              ? "Your session has been revoked or signed out from another device." 
              : "Your session has timed out due to inactivity."}
            <br />
            Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleLogin}>
            Log In Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
