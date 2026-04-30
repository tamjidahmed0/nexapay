import { Injectable, Logger } from '@nestjs/common';


interface RateConfig {
    base: number;   // mid-market base rate
    min: number;    // floor — never goes below this
    max: number;    // ceiling — never goes above this
    spread: number; // bid-ask spread %
}

// Base rates — all relative to USD
// BDT: 1 USD = 120~130 BDT as requested
const RATE_CONFIG: Record<string, RateConfig> = {
    USD_BDT: { base: 125.0, min: 120.0, max: 130.0, spread: 0.005 },
    BDT_USD: { base: 0.008, min: 0.0077, max: 0.0083, spread: 0.005 },
    USD_EUR: { base: 0.92, min: 0.88, max: 0.96, spread: 0.003 },
    EUR_USD: { base: 1.087, min: 1.04, max: 1.14, spread: 0.003 },
    USD_GBP: { base: 0.79, min: 0.75, max: 0.83, spread: 0.003 },
    GBP_USD: { base: 1.265, min: 1.20, max: 1.33, spread: 0.003 },
    USD_SGD: { base: 1.345, min: 1.28, max: 1.41, spread: 0.003 },
    SGD_USD: { base: 0.743, min: 0.71, max: 0.78, spread: 0.003 },
    EUR_BDT: { base: 135.8, min: 128.0, max: 143.0, spread: 0.006 },
    BDT_EUR: { base: 0.00736, min: 0.007, max: 0.0078, spread: 0.006 },
    GBP_BDT: { base: 157.5, min: 148.0, max: 167.0, spread: 0.006 },
    BDT_GBP: { base: 0.00635, min: 0.006, max: 0.00675, spread: 0.006 },
    EUR_GBP: { base: 0.856, min: 0.82, max: 0.89, spread: 0.003 },
    GBP_EUR: { base: 1.168, min: 1.12, max: 1.22, spread: 0.003 },
    SGD_BDT: { base: 92.8, min: 88.0, max: 97.0, spread: 0.005 },
    BDT_SGD: { base: 0.01078, min: 0.0103, max: 0.01136, spread: 0.005 },
};

// In-memory state — rate drifts from this over time
const rateState: Record<string, number> = {};

@Injectable()
export class FxMockProviderService {
    private readonly logger = new Logger(FxMockProviderService.name);

    /**
     * Get a simulated live rate for a currency pair.
     * Rate drifts ±0.3% from current state on each call — simulates market movement.
     * Stays within the min/max bounds of the config.
     */
    getRate(fromCurrency: string, toCurrency: string): {
        rate: number;
        pair: string;
        bid: number;
        ask: number;
        provider: string;
        timestamp: Date;
    } {
        const pair = `${fromCurrency}_${toCurrency}`;
        const config = RATE_CONFIG[pair];

        if (!config) {
            throw new Error(
                `Currency pair ${pair} is not supported. ` +
                `Supported pairs: ${Object.keys(RATE_CONFIG).join(', ')}`,
            );
        }

        // Initialize state from base if first call
        if (!rateState[pair]) {
            rateState[pair] = config.base;
        }

        // Drift: random walk ±0.3% from current rate
        const driftPct = (Math.random() - 0.5) * 0.006; // -0.3% to +0.3%
        const drifted = rateState[pair] * (1 + driftPct);

        // Clamp within bounds
        const newRate = Math.min(config.max, Math.max(config.min, drifted));
        rateState[pair] = newRate;

        // Bid/ask spread around mid-price
        const halfSpread = newRate * config.spread * 0.5;
        const bid = parseFloat((newRate - halfSpread).toFixed(8));
        const ask = parseFloat((newRate + halfSpread).toFixed(8));
        const mid = parseFloat(newRate.toFixed(8));

        this.logger.log({
            event: 'fx.mock.rate.generated',
            pair,
            rate: mid,
            bid,
            ask,
        });

        return {
            rate: mid,
            pair,
            bid,
            ask,
            provider: 'novapay-mock-fx',
            timestamp: new Date(),
        };
    }

}