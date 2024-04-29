import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Config } from '../app.config'
import { Connection, MemcmpFilter, PublicKey } from "@solana/web3.js";
import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityPoolKeysV4, LiquidityStateV4, MARKET_STATE_LAYOUT_V3, Market } from "@raydium-io/raydium-sdk";
import { RAYDIUM_POOL } from "./web3.constants";

@Injectable()
export class Web3Client {
	private logger: Logger = new Logger(Web3Client.name)
	readonly connection: Connection

	constructor(private configService: ConfigService) {
		const config = this.configService.get<Config['web3']>('web3')
		if (!config.rpcEndpoint || !config.wssEndpoint) {
			throw new Error('RPC/WSS endpont not configured')
		}
		this.logger.log('RPC ENDPOINT: ' + config.rpcEndpoint)
		this.logger.log('WSS ENDPOINT: ' + config.wssEndpoint)
		this.connection = new Connection(config.rpcEndpoint, {
			wsEndpoint: config.wssEndpoint
		})
	}

	async getTransaction(txId: string) {
		try {
			const tx = await this.connection.getParsedTransaction(
				txId,
				{
					maxSupportedTransactionVersion: 0,
					commitment: 'finalized',
				});
			return tx
		} catch {
			return null
		}
	}

	async getLiquidityState(mintToken: string) {
		const filter: MemcmpFilter = {
			memcmp: {
				offset: (30 * 8) + 64 + 32 + 64,
				bytes: mintToken,
			},
		}
		// TODO: use getParsedProgramAccounts?
		const raw = await this.connection.getProgramAccounts(new PublicKey(RAYDIUM_POOL), {
			commitment: 'finalized',
			filters: [filter]
		})
		const parsed = raw.map(({ pubkey, account }) => ({
			id: pubkey,
			version: 4,
			...LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)
		}))
		return parsed[0]
	}

	// TODO: move addresses to constants + clean
	async buildPoolKeys(token: string): Promise<LiquidityPoolKeysV4> {
		const programId = new PublicKey(RAYDIUM_POOL)
		const pool = await this.getLiquidityState(token)
		if (!pool) {
			return null
		}
		const _marketInfo = await this.connection.getAccountInfo(pool.marketId, 'finalized')

		const market = { programId: _marketInfo.owner, ...MARKET_STATE_LAYOUT_V3.decode(_marketInfo.data) }

		const authority = Liquidity.getAssociatedAuthority({ programId }).publicKey
		const formatPoolInfo: LiquidityPoolKeysV4 = {
			id: pool.id,
			baseMint: pool.baseMint,
			quoteMint: pool.quoteMint,
			lpMint: pool.lpMint,
			baseDecimals: pool.baseDecimal.toNumber(),
			quoteDecimals: pool.quoteDecimal.toNumber(),
			lpDecimals:
				pool.id.toString() === '6kmMMacvoCKBkBrqssLEdFuEZu2wqtLdNQxh9VjtzfwT' ? 5 : pool.baseDecimal.toNumber(),
			version: 4,
			programId: programId,
			authority: authority,
			openOrders: pool.openOrders,
			targetOrders: pool.targetOrders,
			baseVault: pool.baseVault,
			quoteVault: pool.quoteVault,
			marketVersion: 3,
			marketProgramId: market.programId,
			marketId: market.ownAddress,
			marketAuthority: Market.getAssociatedAuthority({
				programId: market.programId,
				marketId: market.ownAddress,
			}).publicKey,
			marketBaseVault: market.baseVault,
			marketQuoteVault: market.quoteVault,
			marketBids: market.bids,
			marketAsks: market.asks,
			marketEventQueue: market.eventQueue,
			withdrawQueue: pool.withdrawQueue,
			lpVault: pool.lpVault,
			lookupTableAccount: PublicKey.default,
		}

		return formatPoolInfo
	}

	async getPoolAmounts(vaults: VaultsInfo): Promise<AmountsInfo> {
		// TODO: case in redis
		const [baseTokenAmount, quoteTokenAmount] = await Promise.all([
			await this.connection.getTokenAccountBalance(vaults.baseVault, 'finalized'),
			await this.connection.getTokenAccountBalance(vaults.quoteVault, 'finalized')
		])
		return {
			baseAmount: baseTokenAmount.value.uiAmount,
			quoteAmount: quoteTokenAmount.value.uiAmount
		}
	}
}

type VaultsInfo = {
	baseVault: PublicKey,
	quoteVault: PublicKey
}

type AmountsInfo = {
	baseAmount: number,
	quoteAmount: number
}
