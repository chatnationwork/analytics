import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  async debit(params: {
    organizationId: string;
    amount: number;
    module: string;
    action: string;
    referenceId: string;
  }) {
    this.logger.log(
      `[STUB] Wallet debit for org ${params.organizationId}: ${params.amount} tokens`,
    );
    return true;
  }
}
