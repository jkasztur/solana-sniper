import {
	Module,
} from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import configuration from './app.config'
import { AppController } from './app.controller'
import { RedisModule } from '@songkeys/nestjs-redis'
import { ScheduleModule } from '@nestjs/schedule'
import { ListenerModule } from './listeners/listener.module'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { VerifierModule } from './verifier/verifier.module'
import { BullModule } from '@nestjs/bull'
import { TransactionsModule } from './transactions/transactions.module'
import { Web3Module } from './web3/web3.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			ignoreEnvFile: true,
			load: [configuration],
		}),
		RedisModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				commonOptions: {
					lazyConnect: false,
				},
				config: {
					...configService.get('redis'),
					maxRetriesPerRequest: 1,
					showFriendlyErrorStack: true,
				},
			}),
		}),
		BullModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				redis: configService.get('redis'),
				defaultJobOptions: {
					timeout: 120_000,
				},
			})
		}),
		ScheduleModule.forRoot(),
		EventEmitterModule.forRoot(),
		Web3Module,
		ListenerModule,
		VerifierModule,
		TransactionsModule,
		Web3Module
	],
	controllers: [AppController],
	providers: [],
})
export class AppModule { }
