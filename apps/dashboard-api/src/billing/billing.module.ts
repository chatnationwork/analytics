import { Module } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { WalletService } from "./wallet.service";

@Module({
  providers: [PaymentService, WalletService],
  exports: [PaymentService, WalletService],
})
export class BillingModule {}
