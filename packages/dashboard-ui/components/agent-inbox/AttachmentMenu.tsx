"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Paperclip,
  Image,
  Video,
  Mic,
  FileText,
  MapPin,
  SendHorizontal,
  User,
} from "lucide-react";
import type { SendMessagePayload } from "@/lib/api/agent";
import { uploadMedia } from "@/lib/api/agent";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";

const ATTACH_OPTIONS: {
  type: SendMessagePayload["type"];
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "contacts", label: "Contact", icon: <User className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <Image className="h-4 w-4" /> },
  { type: "video", label: "Video", icon: <Video className="h-4 w-4" /> },
  { type: "audio", label: "Audio", icon: <Mic className="h-4 w-4" /> },
  {
    type: "document",
    label: "Document",
    icon: <FileText className="h-4 w-4" />,
  },
  { type: "location", label: "Location", icon: <MapPin className="h-4 w-4" /> },
];

interface AttachmentMenuProps {
  onSend: (payload: SendMessagePayload) => Promise<void>;
  disabled?: boolean;
}

export function AttachmentMenu({ onSend, disabled }: AttachmentMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogType, setDialogType] = useState<
    SendMessagePayload["type"] | null
  >(null);
  const [isSending, setIsSending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state per type
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [filename, setFilename] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const openForm = (type: SendMessagePayload["type"]) => {
    setMenuOpen(false);
    setDialogType(type);
    setSelectedFile(null);
    setCaption("");
    setFilename("");
    setLatitude("");
    setLongitude("");
    setLocationName("");
    setAddress("");
  };

  const closeDialog = () => {
    setDialogType(null);
  };

  const canBuildPayload = (): boolean => {
    if (!dialogType) return false;
    if (dialogType === "location") {
      return !!(latitude.trim() && longitude.trim());
    }
    if (
      dialogType === "image" ||
      dialogType === "video" ||
      dialogType === "audio" ||
      dialogType === "document"
    ) {
      return !!selectedFile;
    }
    return false;
  };

  const handleSendAttachment = async () => {
    if (!dialogType || !canBuildPayload() || isSending) return;

    if (dialogType === "location") {
      const payload: SendMessagePayload = {
        type: "location",
        latitude: latitude.trim(),
        longitude: longitude.trim(),
        name: locationName.trim() || undefined,
        address: address.trim() || undefined,
      };
      setIsSending(true);
      try {
        await onSend(payload);
        closeDialog();
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (
      (dialogType === "image" ||
        dialogType === "video" ||
        dialogType === "audio" ||
        dialogType === "document") &&
      selectedFile
    ) {
      setIsSending(true);
      try {
        const { url } = await uploadMedia(selectedFile);
        const payload: SendMessagePayload = {
          type: dialogType,
          media_url: url,
          content: caption.trim() || undefined,
          filename:
            dialogType === "document"
              ? filename.trim() || selectedFile.name || undefined
              : undefined,
        };
        await onSend(payload);
        closeDialog();
      } finally {
        setIsSending(false);
      }
    }
  };

  const dialogTitle =
    dialogType === "image"
      ? "Send image"
      : dialogType === "video"
        ? "Send video"
        : dialogType === "audio"
          ? "Send audio"
          : dialogType === "document"
            ? "Send document"
            : dialogType === "location"
              ? "Send location"
              : "Attachment";

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={disabled}
        title="Attach"
        aria-label="Attach file or location"
      >
        <Paperclip className="h-5 w-5" />
      </Button>

      {menuOpen && (
        <div
          className={cn(
            "absolute bottom-full left-0 mb-1 z-50 min-w-[180px] rounded-lg border bg-popover p-1 shadow-md",
            "animate-in fade-in-0 zoom-in-95",
          )}
        >
          {ATTACH_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => openForm(opt.type)}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={dialogType !== null}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          {dialogType === "image" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="attach-image-file">Image file</Label>
                <input
                  id="attach-image-file"
                  type="file"
                  accept="image/*"
                  aria-label="Choose image file"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-caption">Caption (optional)</Label>
                <Input
                  id="attach-caption"
                  placeholder="Caption for image"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}

          {dialogType === "video" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="attach-video-file">Video file</Label>
                <input
                  id="attach-video-file"
                  type="file"
                  accept="video/*"
                  aria-label="Choose video file"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-caption">Caption (optional)</Label>
                <Input
                  id="attach-caption"
                  placeholder="Caption for video"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}

          {dialogType === "audio" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Audio file</Label>
                <input
                  type="file"
                  accept="audio/*"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          )}

          {dialogType === "document" && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="attach-document-file">Document file</Label>
                <input
                  id="attach-document-file"
                  type="file"
                  accept="*"
                  aria-label="Choose document file"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {selectedFile.name}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-filename">Filename (optional)</Label>
                <Input
                  id="attach-filename"
                  placeholder="document.pdf"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-caption">Caption (optional)</Label>
                <Input
                  id="attach-caption"
                  placeholder="Document caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}

          {dialogType === "location" && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="attach-lat">Latitude</Label>
                  <Input
                    id="attach-lat"
                    placeholder="e.g. 28.7"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="attach-lng">Longitude</Label>
                  <Input
                    id="attach-lng"
                    placeholder="e.g. 77.1"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-name">Name (optional)</Label>
                <Input
                  id="attach-name"
                  placeholder="e.g. New Delhi"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="attach-address">Address (optional)</Label>
                <Input
                  id="attach-address"
                  placeholder="Full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}

          {dialogType === "contacts" && (
            <ContactPicker
              onSelect={async (contact) => {
                const payload: SendMessagePayload = {
                  type: "contacts",
                  contacts: [contact],
                };
                setIsSending(true);
                try {
                  await onSend(payload);
                  closeDialog();
                } finally {
                  setIsSending(false);
                }
              }}
              onCancel={closeDialog}
            />
          )}

          {dialogType && dialogType !== "contacts" && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendAttachment}
                disabled={!canBuildPayload() || isSending}
                className="gap-1.5"
              >
                <SendHorizontal className="h-4 w-4" />
                {isSending ? "Sending…" : "Send"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
