import { InjectQueue, OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";
import { TransactionsService } from "src/transactions/transactions.service";
import { Web3Client } from "src/web3/web3.client";
import { BuyJobData, SellJobData } from "src/app.types";
import { ConfigService } from "@nestjs/config";
import { waitFor } from "src/app.utils";

@Processor('buy')
export class BuyProcessor {
	private logger: Logger = new Logger(BuyProcessor.name)
	private buyAmount: string
	private testMode: boolean

	constructor(
		private transactionsService: TransactionsService,
		private web3Client: Web3Client,
		configService: ConfigService,
		@InjectQueue('sell') private sellQueue: Queue<BuyJobData>
	) {
		this.buyAmount = configService.get('buyAmount')
		this.testMode = configService.get('testMode')
		this.logger.debug(`Starting with buy amount: ${this.buyAmount}`)
	}

	@Process()
	async handleBuy(job: Job<BuyJobData>) {
		this.logger.debug('Processing job')
		const { pool, base } = job.data
		const poolKeys = await this.web3Client.buildPoolKeys(base)
		if (!poolKeys) {
			this.logger.error(`[${pool}] Failed to build pool keys`)
			return
		}
		// TODO: move to checks service
		/*const amounts = await this.web3Client.getPoolAmounts({
			baseVault: poolKeys.baseVault,
			quoteVault: poolKeys.quoteVault
		})*/

		const tx = await this.transactionsService.prepareTransaction(poolKeys, true, this.buyAmount)
		let txId: string
		if (this.testMode) {
			const response = await this.transactionsService.simulateTransaction(tx)
			this.logger.debug(JSON.stringify(response))
			return
		}
		txId = await this.transactionsService.sendTransaction(tx)
		this.logger.log(`[${pool}] BUY TX: https://solscan.io/tx/${txId}`)

		const exists = await waitFor(90000, async () => {
			const transaction = await this.web3Client.getTransaction(txId)
			return !!transaction
		})
		this.logger.log(`[tx:${txId}] Status: ${exists}`)
		if (!exists) {
			return
		}

		await this.initSellStrategy(job.data)
	}

	async initSellStrategy(data: SellJobData) {
		// simple, just sell after 1 minute.
		// TODO: make better
		await this.sellQueue.add(data, {
			delay: 60000
		})
	}

	@OnQueueFailed()
	async onFailed(job: Job, err: Error) {
		this.logger.error({ data: job.data, err: JSON.stringify({ msg: err.message, stack: err.stack }) })
		await this.sellQueue.add(job.data, {
			delay: 30000
		})
	}
}