import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createWriteStream, createReadStream, existsSync, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";
import { join } from "path";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

/** MIME type by extension (for serving with correct Content-Type). */
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

@Injectable()
export class MediaService {
  private readonly uploadsDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const dir = this.config.get<string>("media.uploadsDir") ?? "uploads/media";
    this.uploadsDir = dir.startsWith("/") ? dir : join(process.cwd(), dir);
    this.publicBaseUrl = (
      this.config.get<string>("media.publicBaseUrl") ?? ""
    ).replace(/\/$/, "");
  }

  /**
   * Save an uploaded file stream to disk and return the public URL.
   * Filename is a UUID + extension from mimetype or original filename.
   */
  async saveFile(
    stream: NodeJS.ReadableStream,
    originalFilename?: string,
    mimetype?: string,
  ): Promise<{ filename: string; url: string }> {
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }

    const ext = this.getExtension(mimetype, originalFilename);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(this.uploadsDir, filename);

    await pipeline(
      stream as NodeJS.ReadableStream,
      createWriteStream(filepath),
    );

    const url = this.getPublicUrl(filename);
    return { filename, url };
  }

  /**
   * Return the public URL for a stored filename.
   * Used when building WhatsApp payloads (link must be publicly reachable).
   */
  getPublicUrl(filename: string): string {
    return `${this.publicBaseUrl}/api/dashboard/media/${filename}`;
  }

  /**
   * Get the absolute path to a stored file (for serving).
   */
  getFilePath(filename: string): string {
    return join(this.uploadsDir, filename);
  }

  exists(filename: string): boolean {
    return existsSync(this.getFilePath(filename));
  }

  createReadStream(filename: string): NodeJS.ReadableStream {
    return createReadStream(this.getFilePath(filename));
  }

  /** MIME type for a stored filename (for Content-Type when serving). */
  getMimeType(filename: string): string {
    const ext = filename.includes(".")
      ? "." + filename.split(".").pop()!.toLowerCase()
      : "";
    return MIME_BY_EXT[ext] ?? "application/octet-stream";
  }

  private getExtension(mimetype?: string, originalFilename?: string): string {
    if (mimetype && EXT_BY_MIME[mimetype]) {
      return EXT_BY_MIME[mimetype];
    }
    if (originalFilename && originalFilename.includes(".")) {
      return "." + originalFilename.split(".").pop()!.toLowerCase();
    }
    return "";
  }
}
