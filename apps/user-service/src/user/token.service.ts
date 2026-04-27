import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}
 
  async generateAccessToken(userId: string, email: string): Promise<string> {
    const sessionId = uuid();

    const token = this.jwtService.sign(
      { sub: userId, email, sessionId },
    );

    await this.redis.set(
      `session:${userId}:${sessionId}`,
      '1',
      'EX',
      parseInt(process.env.JWT_EXPIRES_IN ?? '900'),
    );

    return token;
  }

  async verifyAccessToken(token: string) {
    const payload = this.jwtService.verify(token) as {
      sub: string;
      email: string;
      sessionId: string;
    };

    const exists = await this.redis.exists(
      `session:${payload.sub}:${payload.sessionId}`,
    );

    if (!exists) throw new Error('SESSION_REVOKED');

    return payload;
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.redis.del(`session:${userId}:${sessionId}`);
  }
}