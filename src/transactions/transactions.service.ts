import { Liquidity, LiquidityAssociatedPoolKeys, LiquidityPoolKeys, LiquidityPoolKeysV4, SPL_ACCOUNT_LAYOUT, TOKEN_PROGRAM_ID, Token, TokenAmount } from '@raydium-io/raydium-sdk'
import { Keypair, PublicKey, Signer, Transaction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from '@coral-xyz/anchor'
import { Injectable, Logger } from "@nestjs/common";
import bs58 from 'bs58'
import { Web3Client } from 'src/web3/web3.client';

@Injectable()
export class TransactionsService {
	private logger: Logger = new Logger(TransactionsService.name)

	private wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY))

	constructor(private web3Client: Web3Client) {
	}

	onApplicationBootstrap() {
		this.logger.log(`Will do transaction with this wallet: ${this.wallet.publicKey}`)
	}

	async simulateTransaction(tx: VersionedTransaction) {
		return await this.web3Client.connection.simulateTransaction(tx)
	}


	async sendTransaction(tx: VersionedTransaction) {
		return await this.web3Client.connection.sendTransaction(tx)
	}

	async prepareTransaction(
		poolKeys: LiquidityPoolKeysV4,
		isBuy: boolean,
		amountInRaw: string,
	) {

		const payer = this.wallet.publicKey
		const quoteAmount = this.getTokenAmount(poolKeys.quoteMint, poolKeys.quoteDecimals, isBuy ? amountInRaw : '1')
		const baseAmount = this.getTokenAmount(poolKeys.baseMint, poolKeys.baseDecimals, isBuy ? '1' : amountInRaw)
		const ownerTokenAccounts = await this.getOwnerTokenAccounts()
		const amounts = {
			amountIn: isBuy ? quoteAmount : baseAmount,
			amountOut: isBuy ? baseAmount : quoteAmount
		}
		const swapTransaction = await Liquidity.makeSwapInstructionSimple({
			connection: this.web3Client.connection,
			makeTxVersion: 0,
			poolKeys: {
				...poolKeys
			},
			userKeys: {
				tokenAccounts: ownerTokenAccounts,
				owner: payer
			},
			...amounts,
			fixedSide: 'in',
			config: {
				bypassAssociatedCheck: false
			},
			computeBudgetConfig: {
				microLamports: 100000
			}
		})

		const recentBlockhashForSwap = await this.web3Client.connection.getLatestBlockhash('finalized')
		const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean)
		const versionedTransaction = new VersionedTransaction(new TransactionMessage({
			payerKey: payer,
			recentBlockhash: recentBlockhashForSwap.blockhash,
			instructions
		}).compileToV0Message())
		versionedTransaction.sign([this.wallet])
		return versionedTransaction
	}

	async getOwnerTokenAccounts() {
		const res = await this.web3Client.connection.getTokenAccountsByOwner(this.wallet.publicKey, {
			programId: TOKEN_PROGRAM_ID
		})
		return res.value.map((i) => ({
			pubkey: i.pubkey,
			programId: i.account.owner,
			accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
		}))
	}

	async getTokenAccountBalance(tokenAccount: PublicKey) {
		const res = await this.web3Client.connection.getTokenAccountBalance(tokenAccount)
		return res.value.amount
	}

	getTokenAmount(tokenIn: PublicKey, decimals: number, rawAmountIn: string) {
		const token = new Token(TOKEN_PROGRAM_ID, tokenIn, decimals)
		return new TokenAmount(token, rawAmountIn, true)
	}
}