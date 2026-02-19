import { Controller, Post, Body, Req, Logger } from "@nestjs/common";
import {
  PaymentCallbackService,
  SafaricomStkCallback,
} from "./payment-callback.service";

export interface SafaricomStkCallbackBody {
  Body: {
    stkCallback: SafaricomStkCallback;
  };
}

@Controller("payments/mpesa")
export class MpesaCallbackController {
  private readonly logger = new Logger(MpesaCallbackController.name);

  constructor(
    private readonly paymentCallbackService: PaymentCallbackService,
  ) {}

  @Post("callback")
  handleCallback(@Req() req: any, @Body() body: SafaricomStkCallbackBody) {
    if (!body?.Body?.stkCallback) {
      return { message: "Invalid payload" };
    }

    // Task 3.4 Security verification
    // 1. IP Validation (Optional/Env dependent)
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    // this.logger.log(`Incoming M-Pesa callback from ${clientIp}`);

    // 2. Shared Secret (If configured)
    const mpesaSecret = process.env.MPESA_CALLBACK_SECRET;
    if (mpesaSecret && req.headers["x-mpesa-secret"] !== mpesaSecret) {
      this.logger.warn(`Unauthorized M-Pesa callback attempt from ${clientIp}`);
      return { ResultCode: 1, ResultDesc: "Unauthorized" };
    }

    // Fire and forget - don't block M-Pesa response
    this.paymentCallbackService.handle(body.Body.stkCallback);

    return {
      ResultCode: 0,
      ResultDesc: "Accepted",
    };
  }
}
