import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HallDocument = HydratedDocument<Hall>;

/** Seats are not stored in the hall: the list is derived from rows × seatsPerRow. */
@Schema({ collection: 'halls' })
export class Hall {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 1 })
  rows: number;

  @Prop({ required: true, min: 1 })
  seatsPerRow: number;
}

export const HallSchema = SchemaFactory.createForClass(Hall);

// Unique hall name. The collation with strength 2 ignores letter case,
// so "Red Hall" and "red hall" are treated as the same name.
HallSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
