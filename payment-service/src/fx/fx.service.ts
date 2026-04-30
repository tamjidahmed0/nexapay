import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { RateService } from './rate.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuoteDto } from './interface/create-quote';


const QUOTE_TTL_MS = 60_000;

@Injectable()
export class FxService {
 
    constructor(
        private readonly rateService: RateService,
        private readonly prisma: PrismaService
    ) { }


    async createQuote(dto : CreateQuoteDto) {
        if (dto.fromCurrency === dto.toCurrency) {
            throw new RpcException({
                statusCode: 400,
                error: 'SAME_CURRENCY_QUOTE',
                message:
                    'fromCurrency and toCurrency must be different. ' +
                    'Use an internal transfer for same-currency movements.',
            });
        }


        // Fetch live rate — throws ServiceUnavailableException if provider is down
        const liveRate = await this.rateService.fetchLiveRate(
            dto.fromCurrency,
            dto.toCurrency,
        );

        const toAmount = parseFloat(
            (dto.fromAmount * liveRate.rate).toFixed(8),
        );

        const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);

        const quote = await this.prisma.fXQuote.create({
            data: {
                requestedBy: dto.userId,
                fromCurrency: dto.fromCurrency,
                toCurrency: dto.toCurrency,
                fromAmount: dto.fromAmount,
                toAmount,
                rate: liveRate.rate,
                provider: liveRate.provider,
                status: 'ACTIVE',
                expiresAt,
            },
        });



        return this.formatQuote(quote);
    }







    private formatQuote(quote: any, forceExpired = false) {
        const now = Date.now();
        const secondsRemaining = forceExpired
            ? 0
            : Math.max(0, Math.floor((quote.expiresAt.getTime() - now) / 1000));

        const isUsable =
            !forceExpired &&
            quote.status === 'ACTIVE' &&
            secondsRemaining > 0;

        return {
            id: quote.id,
            fromCurrency: quote.fromCurrency,
            toCurrency: quote.toCurrency,
            fromAmount: quote.fromAmount.toString(),
            toAmount: quote.toAmount.toString(),
            rate: quote.rate.toString(),
            status: forceExpired ? 'EXPIRED' : quote.status,
            isUsable,
            secondsRemaining,
            expiresAt: quote.expiresAt,
            createdAt: quote.createdAt,
            // Only shown after use
            usedAt: quote.usedAt ?? null,
        };
    }


}
