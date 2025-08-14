import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';
import { Request, Response } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export const RateLimit = (options: RateLimitOptions) => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject('Redis') private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request, rateLimitOptions);

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        // First request in window, set expiration
        await this.redis.expire(
          key,
          Math.ceil(rateLimitOptions.windowMs / 1000),
        );
      }

      if (current > rateLimitOptions.maxRequests) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`);
        throw new HttpException(
          {
            message: 'Rate limit exceeded',
            retryAfter: await this.redis.ttl(key),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Add rate limit headers
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('X-RateLimit-Limit', rateLimitOptions.maxRequests);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, rateLimitOptions.maxRequests - current),
      );
      response.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + (await this.redis.ttl(key)) * 1000).toISOString(),
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Rate limiting error: ${String(error)}`);
      return true; // Fail open
    }
  }

  private generateKey(request: Request, options: RateLimitOptions): string {
    if (options.keyGenerator) {
      return `rate_limit:${options.keyGenerator(request)}`;
    }

    // Default: IP-based rate limiting
    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    const endpoint = `${request.method}:${request.path}`;
    return `rate_limit:${ip}:${endpoint}`;
  }
}
