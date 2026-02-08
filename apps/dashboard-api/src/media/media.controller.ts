import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MediaService } from "./media.service";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest, FastifyReply } from "fastify";

/** FastifyRequest with multipart plugin (req.file()) */
type RequestWithFile = FastifyRequest & {
  file: () => Promise<
    | {
        file: NodeJS.ReadableStream;
        filename: string;
        mimetype: string;
        encoding: string;
        fieldname: string;
      }
    | undefined
  >;
};

@Controller("media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Upload a file. Accepts multipart/form-data with a single file field.
   * Returns the public URL to use when sending media (e.g. WhatsApp link).
   */
  @Post("upload")
  @UseGuards(JwtAuthGuard)
  async upload(
    @Req() req: RequestWithFile,
  ): Promise<{ url: string; filename: string }> {
    const data = await (req as RequestWithFile).file();
    if (!data) {
      throw new BadRequestException(
        "No file in request. Send multipart/form-data with a file field.",
      );
    }
    const result = await this.mediaService.saveFile(
      data.file as NodeJS.ReadableStream,
      data.filename,
      data.mimetype,
    );
    return { url: result.url, filename: result.filename };
  }

  /**
   * Serve an uploaded file by filename (public, no auth - WhatsApp needs to fetch by URL).
   */
  @Get(":filename")
  async serve(
    @Param("filename") filename: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!filename || filename.includes("..") || filename.includes("/")) {
      throw new BadRequestException("Invalid filename");
    }
    if (!this.mediaService.exists(filename)) {
      throw new NotFoundException("File not found");
    }
    const contentType = this.mediaService.getMimeType(filename);
    reply.header("Content-Type", contentType);
    const stream = this.mediaService.createReadStream(filename);
    reply.send(stream);
  }
}
