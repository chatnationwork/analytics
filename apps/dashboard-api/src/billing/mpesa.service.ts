import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "@lib/database";

export interface InitiateStkPushParams {
  organizationId: string;
  contactId?: string;
  identityId?: string;
  payableType: string;
  payableId: string;
  phone: string;
  amount: number;
  currency?: string;
  description?: string;
}

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async initiateStkPush(params: InitiateStkPushParams): Promise<Payment> {
    const {
      organizationId,
      contactId,
      identityId,
      payableType,
      payableId,
      phone,
      amount,
      currency = "KES",
      description,
    } = params;

    // 1. Create Pending Payment Record
    const payment = this.paymentRepo.create({
      organizationId,
      contactId,
      identityId,
      payableType,
      payableId,
      amount,
      currency,
      paymentMethod: "mpesa",
      phoneNumber: phone,
      status: "pending",
      initiatedAt: new Date(),
    });

    // 2. Initiate STK Push (Stub for now, but wired correctly)
    this.logger.log(
      `[M-Pesa] Initiating STK Push for ${phone} amount ${amount} ${currency}`,
    );

    // Simulate API call to Safaricom
    const mockCheckoutRequestId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const mockMerchantRequestId = `MR_${Date.now()}`;

    // 3. Update Payment with Request IDs
    payment.checkoutRequestId = mockCheckoutRequestId;
    payment.merchantRequestId = mockMerchantRequestId;

    // Save to DB
    return this.paymentRepo.save(payment);
  }

  async getStkPushStatus(checkoutRequestId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { checkoutRequestId } });
  }
}
