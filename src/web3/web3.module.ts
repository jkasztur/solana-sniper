import { Module } from "@nestjs/common";
import { Web3Client } from "./web3.client";
import { ConfigModule } from "@nestjs/config";

@Module({
	providers: [Web3Client],
	exports: [Web3Client],
	imports: [ConfigModule]
})
export class Web3Module {

}