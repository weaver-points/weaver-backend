import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection, ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
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

/**
 * Custom error class for schema validation issues
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly eventType: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'SchemaValidationError';
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

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
    @InjectConnection() private readonly connection: Connection,
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

    let type;
    try {
      type = await this.eventTypeModel.findOne({ key: eventTypeKey }).lean();
      if (!type) {
        throw new SchemaValidationError(
          `Unknown event type: ${eventTypeKey}`,
          eventTypeKey,
        );
      }
    } catch (error) {
      this.logger.error(
        `Database lookup failed for event type ${eventTypeKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error(
        `Failed to retrieve event type ${eventTypeKey} from database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }

    try {
      const validate = this.ajv.compile(
        (type as { jsonSchema: Record<string, unknown> }).jsonSchema,
      );
      this.schemaCache.set(eventTypeKey, validate);
      return validate;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to compile JSON schema for event type ${eventTypeKey}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new SchemaValidationError(
        `Invalid JSON schema for event type ${eventTypeKey}: ${errorMessage}`,
        eventTypeKey,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async publishToRedisWithRetry(
    channel: string,
    message: string,
    eventId: string,
    maxRetries = 3,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.redisClient.publish(channel, message);
        return;
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt - 1)),
        );
      }
    }

    await this.eventModel
      .findByIdAndUpdate(eventId, {
        $set: { status: EventStatus.PUBLISH_FAILED },
        $push: {
          publishErrors: {
            channel,
            error: lastError?.message,
            timestamp: new Date(),
          },
        },
      })
      .catch((err: Error) =>
        this.logger.error(`Failed to update event status: ${err.message}`),
      );

    throw new Error(
      `Redis publish failed after ${maxRetries} retries: ${lastError?.message}`,
    );
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
      const validationErrors = this.ajv.errorsText(validate.errors || []);
      const message = `Payload validation failed for ${createDto.type}: ${validationErrors}`;
      this.logger.warn(message);
      throw new SchemaValidationError(message, createDto.type);
    }

    const session: ClientSession = await this.connection.startSession();

    try {
      session.startTransaction();
      this.logger.debug('Started transaction for event publishing');

      const doc = new this.eventModel({
        ...createDto,
        severity,
        occurredAt,
        status: EventStatus.NEW,
      });

      const saved = await doc.save({ session });
      this.logger.debug(
        `Event saved to database with ID: ${saved._id.toString()}`,
      );

      const eventMessage = JSON.stringify({
        id: saved._id.toString(),
        type: createDto.type,
        payload: createDto.payload,
        metadata: createDto.metadata,
        occurredAt,
      });

      try {
        const eventId = saved._id.toString();
        const eventChannel = `events:${createDto.type}`;
        await this.publishToRedisWithRetry(eventChannel, eventMessage, eventId);

        if (createDto.stream) {
          const streamChannel = `streams:${createDto.stream}`;
          await this.publishToRedisWithRetry(
            streamChannel,
            eventMessage,
            eventId,
          );
        }

        await session.commitTransaction();
        this.logger.debug('Transaction committed successfully');

        return saved;
      } catch (redisError) {
        this.logger.error(
          `Redis publish failed, aborting transaction: ${(redisError as Error).message}`,
        );
        await session.abortTransaction();
        throw redisError;
      }
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
        this.logger.error(
          `Transaction aborted due to error: ${(error as Error).message}`,
        );
      }
      throw error;
    } finally {
      await session.endSession();
      this.logger.debug('Transaction session ended');
    }
  }
}
