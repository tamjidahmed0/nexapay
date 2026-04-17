import {
    Injectable,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

export interface IdempotencyResult {
    isNew: boolean;
    cachedResponse?: any;
    cachedStatus?: number;
}

@Injectable()
export class IdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Canonical payload hash — field order does not matter.
     * Same logical request always produces the same hash.
     */
    hashPayload(body: object): string {
        return createHash('sha256')
            .update(JSON.stringify(body, Object.keys(body).sort()))
            .digest('hex');
    }



    async acquireOrReplay(
        key: string,
        clientId: string,
        payload: object,
    ): Promise<IdempotencyResult> {
        const payloadHash = this.hashPayload(payload);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

        try {
            // Attempt insert — unique constraint on `key` means only one wins
            await this.prisma.idempotencyKey.create({
                data: {
                    key,
                    clientId,
                    payloadHash,
                    status: 'PROCESSING',
                    expiresAt,
                },
            });

            // We won — this is a new request
            return { isNew: true };
        } catch (err: any) {
            // P2002 = unique constraint violation — key already exists
            if (err.code !== 'P2002') throw err;

            const existing = await this.prisma.idempotencyKey.findUnique({
                where: { key },
            });

            if (!existing) {
                // Deleted between our failed insert and this read — retry once
                return this.acquireOrReplay(key, clientId, payload);
            }

            // Scenario D: expired key — delete and start fresh
            if (existing.expiresAt < new Date()) {
                this.logger.warn({
                    event: 'idempotency.key.expired_reuse',
                    key,
                    originalExpiry: existing.expiresAt,
                });

                await this.prisma.idempotencyKey.delete({ where: { key } });
                return this.acquireOrReplay(key, clientId, payload);
            }

            // Scenario E: payload mismatch
            if (existing.payloadHash !== payloadHash) {
                throw new BadRequestException({
                    error: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                    message: `Idempotency key '${key}' was already used with a different request payload.`,
                });
            }

            // Scenario B: in-flight — another request is processing right now
            if (existing.status === 'PROCESSING') {
                throw new ConflictException({
                    error: 'IDEMPOTENCY_IN_PROGRESS',
                    message: `A request with key '${key}' is already being processed. Retry after completion.`,
                });
            }

            // Scenario A: already completed or failed — return cached response
            this.logger.log({
                event: 'idempotency.replay',
                key,
                status: existing.status,
            });

            return {
                isNew: false,
                cachedResponse: existing.responseBody,
                cachedStatus: existing.responseCode ?? 200,
            };
        }
    }

    async markCompleted(
        key: string,
        transactionId: string,
        responseBody: object,
        responseCode = 201,
    ) {
        await this.prisma.idempotencyKey.update({
            where: { key },
            data: {
                status: 'COMPLETED',
                transactionId,
                responseBody,
                responseCode,
            },
        });
    }

    async markFailed(key: string, reason: string) {
        await this.prisma.idempotencyKey.update({
            where: { key },
            data: {
                status: 'FAILED',
                responseBody: { error: reason },
                responseCode: 422,
            },
        });
    }
}