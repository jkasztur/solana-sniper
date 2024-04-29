import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CheckingService } from "./checks.service";
import { Web3Module } from "src/web3/web3.module";

@Module({
	providers: [CheckingService],
	imports: [
		Web3Module,
		BullModule.registerQueue({
			name: 'buy'
		}),
	]
})
export class VerifierModule {

}