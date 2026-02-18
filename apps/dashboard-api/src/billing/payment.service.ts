import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  async stkPush(params: { phone: string; amount: number; reference: string }) {
    this.logger.log(
      `[STUB] STK Push initiated for ${params.phone} amount ${params.amount}`,
    );
    return {
      CheckoutRequestID: `ws_CO_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    };
  }
}
