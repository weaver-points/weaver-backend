import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEventDto } from '../dto/create-event.dto';
import {
  EventEntity,
  EventSeverity,
  EventStatus,
} from '../entities/event.entity';
import { EventTypeEntity } from '../entities/event-type.entity';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Redis } from 'ioredis';

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);
  private readonly ajv: Ajv;
  private schemaCache = new Map<string, ValidateFunction>();

  constructor(
    @InjectModel(EventEntity.name)
    private readonly eventModel: Model<EventEntity>,
    @InjectModel(EventTypeEntity.name)
    private readonly eventTypeModel: Model<EventTypeEntity>,
    // Redis instance is provided by module
    @Inject('Redis') private readonly redisClient: Redis,
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  private async getValidatorForType(
    eventTypeKey: string,
  ): Promise<ValidateFunction> {
    const cached = this.schemaCache.get(eventTypeKey);
    if (cached) return cached;
    const type = await this.eventTypeModel
      .findOne({ key: eventTypeKey })
      .lean();
    if (!type) {
      throw new Error(`Unknown event type: ${eventTypeKey}`);
    }
    const validate = this.ajv.compile(
      type.jsonSchema as Record<string, unknown>,
    );
    this.schemaCache.set(eventTypeKey, validate);
    return validate;
  }

  async publish(createDto: CreateEventDto): Promise<EventEntity> {
    const occurredAt = createDto.occurredAt
      ? new Date(createDto.occurredAt)
      : new Date();
    const severity = createDto.severity ?? EventSeverity.LOW;
    const validate = await this.getValidatorForType(createDto.type);
    const payload = createDto.payload;
    const valid = validate(payload);
    if (!valid) {
      const message = `Payload validation failed for ${createDto.type}: ${this.ajv.errorsText(
        validate.errors || [],
      )}`;
      this.logger.warn(message);
      throw new Error(message);
    }
    const doc = new this.eventModel({
      ...createDto,
      severity,
      occurredAt,
      status: EventStatus.NEW,
    });
    const saved = await doc.save();

    // Notify subscribers via Redis pub/sub (channel per event type)
    const channel = `events:${createDto.type}`;
    await this.redisClient.publish(
      channel,
      JSON.stringify({
        id: saved._id.toString(),
        type: createDto.type,
        payload: createDto.payload,
        metadata: createDto.metadata,
        occurredAt,
      }),
    );

    // Broadcast a generic stream channel
    if (createDto.stream) {
      await this.redisClient.publish(
        `streams:${createDto.stream}`,
        JSON.stringify({
          id: saved._id.toString(),
          type: createDto.type,
          payload: createDto.payload,
          metadata: createDto.metadata,
          occurredAt,
        }),
      );
    }

    return saved;
  }
}
