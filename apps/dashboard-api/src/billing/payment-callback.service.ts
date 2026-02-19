import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "@lib/database";

export interface SafaricomStkCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value?: string | number;
    }>;
  };
}

export interface PaymentFulfilledHandler {
  onPaymentFulfilled(payment: Payment): Promise<void>;
}

@Injectable()
export class PaymentCallbackService {
  private readonly logger = new Logger(PaymentCallbackService.name);
  private handlers = new Map<string, PaymentFulfilledHandler>();

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  register(payableType: string, handler: PaymentFulfilledHandler) {
    this.handlers.set(payableType, handler);
    this.logger.log(`Registered payment handler for: ${payableType}`);
  }

  async handle(stkCallback: SafaricomStkCallback): Promise<void> {
    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;
    this.logger.log(
      `[PaymentCallback] Received callback for ${CheckoutRequestID} (Code: ${ResultCode})`,
    );

    // 1. Find the Payment record
    const payment = await this.paymentRepo.findOne({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!payment) {
      this.logger.error(
        `[PaymentCallback] Payment not found for CheckoutRequestID: ${CheckoutRequestID}`,
      );
      return;
    }

    if (payment.status === "completed") {
      this.logger.warn(
        `[PaymentCallback] Payment ${payment.id} already completed`,
      );
      return;
    }

    // 2. Update Payment record
    if (ResultCode === 0) {
      payment.status = "completed";
      payment.completedAt = new Date();
      payment.mpesaReceiptNumber = this.extractReceipt(stkCallback) || "";
    } else {
      payment.status = "failed";
      payment.failureReason = ResultDesc;
    }

    payment.providerMetadata = stkCallback as any;
    await this.paymentRepo.save(payment);

    // 3. Dispatch to the module handler
    if (payment.status === "completed") {
      const handler = this.handlers.get(payment.payableType);
      if (handler) {
        try {
          await handler.onPaymentFulfilled(payment);
          this.logger.log(
            `[PaymentCallback] Dispatched fulfillment for ${payment.payableType}:${payment.payableId}`,
          );
        } catch (e) {
          this.logger.error(
            `[PaymentCallback] Handler failed for ${payment.payableType}: ${e.message}`,
          );
        }
      } else {
        this.logger.warn(
          `[PaymentCallback] No handler registered for payableType: ${payment.payableType}`,
        );
      }
    }
  }

  private extractReceipt(stkCallback: SafaricomStkCallback): string | null {
    const items = stkCallback.CallbackMetadata?.Item;
    if (!items) return null;
    const receiptItem = items.find((i) => i.Name === "MpesaReceiptNumber");
    return receiptItem?.Value?.toString() || null;
  }
}
