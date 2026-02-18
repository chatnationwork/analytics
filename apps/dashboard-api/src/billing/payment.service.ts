import { Injectable, Logger } from "@nestjs/common";
import { MpesaService } from "./mpesa.service";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly mpesaService: MpesaService) {}

  /**
   * Facade for MpesaService.initiateStkPush
   * Note: The old stub returned { CheckoutRequestID... }.
   * The new service returns a Payment entity.
   *
   * For backward compatibility with existing calls (if any), we might need to adapt.
   * But EosTicketService is the only consumer and we are rewriting it in Phase 1.
   *
   * @deprecated usage should be replaced by MpesaService directly
   */
  async stkPush(params: { phone: string; amount: number; reference: string }) {
    this.logger.warn(
      `[DEPRECATED] PaymentService.stkPush called. Using MpesaService internally.`,
    );

    // We have to invent a payableType/ID since the old signature didn't have it.
    // This is a stub adaptation. Real usage should use MpesaService directly.
    const payment = await this.mpesaService.initiateStkPush({
      organizationId: "unknown-org", // Fallback, shouldn't happen in real usage
      payableType: "legacy_stub",
      payableId: params.reference,
      phone: params.phone,
      amount: params.amount,
      currency: "KES",
    });

    return {
      CheckoutRequestID: payment.checkoutRequestId,
      ResponseCode: "0",
      ResponseDescription: "Success. Request accepted for processing",
      CustomerMessage: "Success. Request accepted for processing",
    };
  }
}
