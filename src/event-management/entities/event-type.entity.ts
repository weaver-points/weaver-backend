import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventTypeDocument = HydratedDocument<EventTypeEntity>;

@Schema({ timestamps: true, collection: 'event_types' })
export class EventTypeEntity {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  key!: string; // e.g., protocol.transaction.created

  @Prop({ required: true })
  category!: 'protocol' | 'user' | 'system';

  @Prop({ type: Object, required: true })
  jsonSchema!: Record<string, unknown>; // AJV JSON schema for payload

  @Prop({ required: false })
  description?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];
}

export const EventTypeSchema = SchemaFactory.createForClass(EventTypeEntity);
