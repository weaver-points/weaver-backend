import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export function createClientProvider(token: string): FactoryProvider<Redis> {
  return {
    provide: token,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const url =
        configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      return new Redis(url);
    },
  };
}
