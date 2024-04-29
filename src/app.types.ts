export type PoolInitializeEvent = {
	pool: string,
	base: string,
	quote: string,
	openTime: number
}

export type BuyJobData = {
	pool: string,
	base: string,
}

export type SellJobData = BuyJobData
