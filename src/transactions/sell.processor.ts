import { InjectQueue, OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job, Queue } from "bull";
import { TransactionsService } from "src/transactions/transactions.service";
import { Web3Client } from "src/web3/web3.client";
import { BuyJobData } from "src/app.types";
import { waitFor } from "src/app.utils";

@Processor('sell')
export class SellProcessor {
	private logger: Logger = new Logger(SellProcessor.name)

	constructor(
		private transactionsService: TransactionsService,
		private web3Client: Web3Client,
		@InjectQueue('sell') private sellQueue: Queue<BuyJobData>
	) {
	}

	@Process()
	async handleSell(job: Job<BuyJobData>) {
		this.logger.debug('Processing job')
		const { pool, base } = job.data
		const poolKeys = await this.web3Client.buildPoolKeys(base)
		if (!poolKeys) {
			this.logger.error(`[${pool}] Failed to build pool keys`)
			return
		}

		const ownerAccounts = await this.transactionsService.getOwnerTokenAccounts()
		const baseOwnerAccount = ownerAccounts.find((account) => {
			return account.accountInfo.mint.toBase58() === base
		})
		if (!baseOwnerAccount) {
			this.logger.error(`[${pool}] Not found owner account`)
			return
		}

		const balance = await this.transactionsService.getTokenAccountBalance(baseOwnerAccount.pubkey)
		if (Number.parseInt(balance) === 0) {
			return
		}
		const sellTx = await this.transactionsService.prepareTransaction(poolKeys, false, balance)
		const txId = await this.transactionsService.sendTransaction(sellTx)

		this.logger.log(`[${pool}] SELL TX: https://solscan.io/tx/${txId}`)
		const exists = await waitFor(90000, async () => {
			const transaction = await this.web3Client.getTransaction(txId)
			return !!transaction
		})
		if (!exists) {
			throw new Error(`[tx:${txId}] Failed, retrying`)
		} else {
			this.logger.log(`[tx:${txId}] SELL SUCCESSFULL`)
		}
	}

	@OnQueueFailed()
	async onFailed(job: Job, err: Error) {
		this.logger.error({ data: job.data, err: err.message })
		await this.sellQueue.add(job.data)
	}
}