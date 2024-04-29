import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { PublicKey } from '@solana/web3.js'
import { InjectRedis } from "@songkeys/nestjs-redis";
import Redis from 'ioredis'
import { Web3Client } from "src/web3/web3.client";
import { RAYDIUM_POOL, SOL, WSOL } from "src/web3/web3.constants";

@Injectable()
export class InitilizeListener {
	private logger: Logger = new Logger(InitilizeListener.name)
	private subscriptionId: number = null
	private enabled = true

	constructor(
		private eventEmitter: EventEmitter2,
		private web3Client: Web3Client,
		@InjectRedis() private readonly redis: Redis,
	) {
	}

	async onApplicationBootstrap() {
		if (this.enabled) {
			await this.startListening()
		} else {
			this.logger.warn('Listener is disabled')
		}
	}

	async onApplicationShutdown() {
		if (this.subscriptionId) {
			await this.web3Client.connection.removeOnLogsListener(this.subscriptionId)
			this.logger.log(`Removed listener ${this.subscriptionId}`)
		}
	}


	async startListening() {
		this.subscriptionId = this.web3Client.connection.onLogs(new PublicKey(RAYDIUM_POOL), ({ logs, err, signature }) => {
			if (err) {
				return
			}
			if (!logs || logs.length === 0) {
				return
			}
			const found = logs.find(log => log.includes('initialize2'))
			if (found) {
				const openTime = found.split('open_time: ')[1].split(', init_pc_amount')[0]
				this.eventEmitter.emit('initialize2', { signature, openTime: Number.parseInt(openTime) })
			}
		}, 'finalized')
		this.logger.log(`Started listener for new tokens: ${this.subscriptionId}`)
	}

	@OnEvent('initialize2')
	async handleInitialize2({ signature, openTime }: Initialize2Event) {
		const isLocked = this.lockSignature(signature)
		if (!isLocked) {
			return
		}
		this.logger.debug('Initialize2 signature: ' + signature)

		const transaction = await this.web3Client.getTransaction(signature);
		if (!transaction) {
			this.logger.warn(`[tx:${signature}] Not found transaction`)
			return
		}

		const found: any = transaction?.transaction.message.instructions.find(ix => ix.programId.toBase58() === RAYDIUM_POOL);
		const accounts = found?.accounts
		if (!accounts) {
			this.logger.debug(`[tx:${signature}] No accounts found, skipping`)
			return
		}

		const pool = accounts[4];
		const tokenAAccount = accounts[8];
		const tokenBAccount = accounts[9];

		if (tokenAAccount.toBase58() === WSOL) {
			this.eventEmitter.emit('pool.initialized', {
				pool,
				base: tokenBAccount,
				quote: tokenAAccount,
				openTime: openTime * 1000
			})
		} else if (tokenBAccount.toBase58() === WSOL) {
			this.eventEmitter.emit('pool.initialized', {
				pool,
				base: tokenAAccount,
				quote: tokenBAccount,
				openTime: openTime * 1000
			})
		} else {
			this.logger.debug(`[tx:${signature}] Does not involve WSOL, skipping`)
		}
	}

	private async lockSignature(signature: string): Promise<boolean> {
		const isNew = await this.redis.setnx(`lock:signature:${signature}`, 1)
		if (isNew === 0) {
			return false
		}
		await this.redis.expire(`lock:signature:${signature}`, 60)
		return true
	}
}

type Initialize2Event = {
	signature: string,
	openTime: number
}

