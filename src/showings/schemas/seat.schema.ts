import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

/**
 * One seat of the hall inside a showing document. The seat is free while
 * bookingId is null; this array is the source of truth about occupancy.
 */
@Schema({ _id: false })
export class Seat {
  @Prop({ required: true, min: 1 })
  row: number;

  @Prop({ required: true, min: 1 })
  seat: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
  bookingId: Types.ObjectId | null;
}

export const SeatSchema = SchemaFactory.createForClass(Seat);
