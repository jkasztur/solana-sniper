export interface Config {
	redis: {
		host: string
		port: number
		database: number
	},
	web3: {
		rpcEndpoint: string,
		wssEndpoint: string
	},
	testMode: boolean, // if true, will not buy anything, just verify
	walletPrivateKey: string,
	buyAmount: string // '1000000' -> 0.001 SOL
}

export default (): Config => {
	const config: Config = {
		redis: {
			host: process.env.REDIS_HOST || 'localhost',
			port: parseInt(process.env.REDIS_PORT, 10) || 3005,
			database: parseInt(process.env.REDIS_DATABASE, 10) || 0,
		},
		web3: {
			rpcEndpoint: process.env.RPC_ENDPOINT,
			wssEndpoint: process.env.WSS_ENDPOINT
		},
		walletPrivateKey: process.env.WALLET_PRIVATE_KEY,
		buyAmount: '1000000',
		testMode: false
	}
	return config
}
