import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Film } from '../../films/schemas/film.schema';
import { Hall } from '../../halls/schemas/hall.schema';
import { Booking, BookingSchema } from './booking.schema';
import { Seat, SeatSchema } from './seat.schema';

export type ShowingDocument = HydratedDocument<Showing>;

/**
 * A showing keeps its seats and bookings inside the same document: occupying
 * seats and saving the booking is one atomic single-document update.
 */
@Schema({ collection: 'showings' })
export class Showing {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Film.name,
    required: true,
    index: true,
  })
  film: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Hall.name,
    required: true,
    index: true,
  })
  hall: Types.ObjectId;

  @Prop({ required: true })
  startsAt: Date;

  /** Ticket price in kopecks (125 UAH = 12500). */
  @Prop({ required: true, min: 1 })
  price: number;

  /** All seats of the hall, filled from rows × seatsPerRow when the showing is created. */
  @Prop({ type: [SeatSchema], default: [] })
  seats: Seat[];

  @Prop({ type: [BookingSchema], default: [] })
  bookings: Booking[];
}

export const ShowingSchema = SchemaFactory.createForClass(Showing);

// Schedule order: by start time, ties broken by _id.
ShowingSchema.index({ startsAt: 1, _id: 1 });
// DELETE /bookings/:id finds the showing by the id of an embedded booking.
ShowingSchema.index({ 'bookings._id': 1 });
