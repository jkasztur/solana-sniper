import { Controller, HttpCode, HttpStatus, Get } from '@nestjs/common'

@Controller('/')
export class AppController {
	constructor() { }

	@Get('/status')
	@HttpCode(HttpStatus.OK)
	async getStatus() {
		return { ok: true }
	}
}
