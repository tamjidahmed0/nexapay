import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {

    constructor() {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL as string,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        const adapter = new PrismaPg(pool);
        super({ adapter });
    }

}

