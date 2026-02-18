import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment } from "@lib/database";
import { PaymentService } from "./payment.service";
import { WalletService } from "./wallet.service";
import { MpesaService } from "./mpesa.service";
import { PaymentCallbackService } from "./payment-callback.service";
import { MpesaCallbackController } from "./mpesa-callback.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [MpesaCallbackController],
  providers: [
    PaymentService,
    WalletService,
    MpesaService,
    PaymentCallbackService,
  ],
  exports: [
    PaymentService,
    WalletService,
    MpesaService,
    PaymentCallbackService,
  ],
})
export class BillingModule {}
