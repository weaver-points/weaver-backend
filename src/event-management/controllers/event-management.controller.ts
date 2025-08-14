import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EventManagementService } from '../services/event-management.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventFilterDto } from '../dto/event-filter.dto';
import { CreateEventTypeDto } from '../dto/event-type.dto';
import { CreateEventSubscriptionDto } from '../dto/event-subscription.dto';
import { RateLimitGuard, RateLimit } from '../guards/rate-limit.guard';
import { IsMongoId } from 'class-validator';

class MongoIdParam {
  @IsMongoId()
  id!: string;
}

@Controller('events')
@UseGuards(RateLimitGuard)
export class EventManagementController {
  private readonly logger = new Logger(EventManagementController.name);

  constructor(private readonly service: EventManagementService) {}

  @Post()
  @RateLimit({ windowMs: 60000, maxRequests: 100 }) // 100 events per minute
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateEventDto,
  ) {
    try {
      return await this.service.create(dto);
    } catch (error) {
      this.logger.error(`Failed to create event: ${String(error)}`);
      throw new HttpException(
        'Failed to create event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filter: EventFilterDto,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    // Validate pagination limits
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    try {
      return await this.service.findAll(filter, page, limit);
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${String(error)}`);
      throw new HttpException(
        'Failed to fetch events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('types')
  @RateLimit({ windowMs: 60000, maxRequests: 10 }) // 10 type creations per minute
  async upsertType(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateEventTypeDto,
  ) {
    try {
      const payload = { ...dto, tags: dto.tags ?? [] };
      return await this.service.upsertEventType(payload);
    } catch (error) {
      this.logger.error(`Failed to upsert event type: ${String(error)}`);
      throw new HttpException(
        'Failed to create/update event type',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('types')
  async listTypes() {
    try {
      return await this.service.listEventTypes();
    } catch (error) {
      this.logger.error(`Failed to list event types: ${String(error)}`);
      throw new HttpException(
        'Failed to fetch event types',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subscriptions')
  @RateLimit({ windowMs: 60000, maxRequests: 20 }) // 20 subscriptions per minute
  async createSub(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateEventSubscriptionDto,
  ) {
    try {
      const payload = {
        ...dto,
        filter: dto.filter ?? {},
        enabled: dto.enabled ?? true,
      };
      return await this.service.createSubscription(payload);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create subscription: ${String(error)}`);
      throw new HttpException(
        'Failed to create subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('subscriptions/:subscriberId')
  async listSubs(@Param('subscriberId') subscriberId: string) {
    try {
      // Basic validation for subscriber ID
      if (!subscriberId || subscriberId.length > 100) {
        throw new HttpException(
          'Invalid subscriber ID',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.service.listSubscriptionsBySubscriber(subscriberId);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to list subscriptions: ${String(error)}`);
      throw new HttpException(
        'Failed to fetch subscriptions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  async metrics(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filter: EventFilterDto,
  ) {
    try {
      return await this.service.getMetrics(filter);
    } catch (error) {
      this.logger.error(`Failed to get metrics: ${String(error)}`);
      throw new HttpException(
        'Failed to fetch metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(
    @Param(new ValidationPipe({ transform: true })) params: MongoIdParam,
  ) {
    try {
      const event = await this.service.findOne(params.id);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      return event;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to fetch event ${params.id}: ${String(error)}`);
      throw new HttpException(
        'Failed to fetch event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async update(
    @Param(new ValidationPipe({ transform: true })) params: MongoIdParam,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateEventDto,
  ) {
    try {
      const event = await this.service.update(params.id, dto);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      return event;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to update event ${params.id}: ${String(error)}`,
      );
      throw new HttpException(
        'Failed to update event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
