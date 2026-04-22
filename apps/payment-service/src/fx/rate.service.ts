import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { FxMockProviderService } from "./mockProvider.service";
import Redis from "ioredis";


export interface LiveRate {
    rate: number;
    provider: string;
    fetchedAt: Date;
}



@Injectable()
export class RateService {

    constructor(
        private readonly mockProvider: FxMockProviderService,
        @Inject("REDIS_CLIENT") private readonly redis: Redis,
    ) { }


    async fetchLiveRate(
        fromCurrency: string,
        toCurrency: string,
    ): Promise<LiveRate> {
        try {
            const result = this.mockProvider.getRate(fromCurrency, toCurrency);

            await this.updateDisplayCache(
                result.pair,
                result.rate,
                result.provider,
            );

            return {
                rate: result.rate,
                provider: result.provider,
                fetchedAt: result.timestamp,
            };
        } catch (err: any) {
            // Unsupported pair
            if (err.message?.includes('not supported')) {
                throw new RpcException({
                    statusCode: 400,
                    error: 'UNSUPPORTED_CURRENCY_PAIR',
                    message: err.message,
                });
            }



            // Keep same error contract as real provider —
            // swap to real provider without changing QuoteService
            throw new RpcException({
                statusCode: 503,
                error: 'FX_PROVIDER_UNAVAILABLE',
                message: 'FX rate service is unavailable. Please try again shortly.',
            });
        }





    }






    private async updateDisplayCache(
        pair: string,
        rate: number,
        provider: string,
    ) {

        const value = JSON.stringify({
            rate,
            provider,
            fetchedAt: new Date().toISOString(),
        });

        await this.redis.set(
            `fx:${pair}`,
            JSON.stringify(value),
            "EX",
            60,
        );
    }


}