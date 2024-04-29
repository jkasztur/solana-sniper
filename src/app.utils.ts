import { delay } from "bluebird"

export async function waitFor(timeout: number, callback: () => boolean | Promise<boolean>) {
	let ready = false
	let counter = timeout / 1000

	do {
		await delay(1000)
		try {
			ready = await callback()
		} catch (err) {
		}
		counter -= 1
	} while (!ready && counter > 0)
	return ready
}