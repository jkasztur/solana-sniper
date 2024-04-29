import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { Web3Module } from "src/web3/web3.module";
import { BullModule } from "@nestjs/bull";
import { BuyProcessor } from "./buy.processor";
import { ConfigModule } from "@nestjs/config";
import { SellProcessor } from "./sell.processor";

@Module({
	imports: [
		Web3Module,
		BullModule.registerQueue({
			name: 'buy'
		}),
		BullModule.registerQueue({
			name: 'sell'
		}),
		ConfigModule
	],
	providers: [TransactionsService, BuyProcessor, SellProcessor],
	exports: [TransactionsService]
})
export class TransactionsModule {

}