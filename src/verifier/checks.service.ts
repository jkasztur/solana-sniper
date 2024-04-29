import { InjectQueue } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Queue } from "bull";
import moment from "moment";
import pick from "object.pick";
import { BuyJobData, PoolInitializeEvent } from "src/app.types";

export class CheckingService {
	private logger: Logger = new Logger(CheckingService.name)

	constructor(
		@InjectQueue('buy') private buyQueue: Queue<BuyJobData>
	) {
	}

	@OnEvent('pool.initialized')
	async onPoolInitialized(event: PoolInitializeEvent) {
		this.logger.debug(`[pool:${event.pool}] Checking started`)
		const result = await this.getValidity(event)
		if (result !== ValidityResult.Ok) {
			this.logger.warn(`[pool:${event.pool}] Invalid because ${result}, skipping`)
			return
		}
		this.logger.debug('Adding job')
		await this.buyQueue.add(pick(event, ['pool', 'base']))
	}

	private getBuyDelay(openTime: number): number {
		// TODO: add delay based on openTime or some other parameter
		return 0
	}


	private async getValidity(event: PoolInitializeEvent): Promise<ValidityResult> {
		// TODO: add your own implementation
		if (moment().isBefore(event.openTime)) {
			return ValidityResult.OpentimeLate
		}

		return ValidityResult.Ok
	}
}

enum ValidityResult {
	Ok = 'ok',
	NoLiquidity = 'no_liquidity',
	OpentimeLate = 'opentime_late',
	//... add more
}