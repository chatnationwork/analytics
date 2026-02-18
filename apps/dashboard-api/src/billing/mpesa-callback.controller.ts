import { Controller, Post, Body } from "@nestjs/common";
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
  constructor(
    private readonly paymentCallbackService: PaymentCallbackService,
  ) {}

  @Post("callback")
  handleCallback(@Body() body: SafaricomStkCallbackBody) {
    if (!body?.Body?.stkCallback) {
      return { message: "Invalid payload" };
    }
    // Fire and forget - don't block M-Pesa response
    this.paymentCallbackService.handle(body.Body.stkCallback);

    return {
      ResultCode: 0,
      ResultDesc: "Accepted",
    };
  }
}
