import { Module } from "@nestjs/common";
import { InitilizeListener } from "./initilialize.listener";
import { Web3Module } from "src/web3/web3.module";

@Module({
	providers: [InitilizeListener],
	imports: [
		Web3Module,
	]
})
export class ListenerModule {

}