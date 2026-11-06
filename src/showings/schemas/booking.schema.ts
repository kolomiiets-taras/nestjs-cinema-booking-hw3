import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/** A booked seat as it is copied into the booking. */
@Schema({ _id: false })
export class BookedSeat {
  @Prop({ required: true, min: 1 })
  row: number;

  @Prop({ required: true, min: 1 })
  seat: number;
}

export const BookedSeatSchema = SchemaFactory.createForClass(BookedSeat);

/**
 * A booking inside a showing document. Its _id is generated in code before
 * the update, because the same id is written into seats[].bookingId.
 * The seat list duplicates what seats[] shows, so a booking can be returned
 * without scanning the whole hall.
 */
@Schema()
export class Booking {
  _id: Types.ObjectId;

  @Prop({ type: [BookedSeatSchema], required: true })
  seats: BookedSeat[];

  /** Showing price × number of seats, in kopecks. */
  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ required: true })
  createdAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
