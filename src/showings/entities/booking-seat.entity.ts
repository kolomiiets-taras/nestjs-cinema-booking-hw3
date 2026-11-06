import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Showing } from './showing.entity';

/**
 * One booked seat = one row. The unique index on (showing_id, row, seat) is what
 * guarantees that a seat of a showing can never be sold twice, even when two
 * requests run at the same time. showing_id is duplicated here on purpose:
 * an index can only cover columns of its own table.
 */
@Entity('booking_seats')
@Index('UQ_booking_seats_showing_row_seat', ['showingId', 'row', 'seat'], {
  unique: true,
})
export class BookingSeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_booking_seats_booking_id')
  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  // Deleting a booking deletes its seats at the database level.
  @ManyToOne(() => Booking, (booking) => booking.seats, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'showing_id', type: 'uuid' })
  showingId: string;

  @ManyToOne(() => Showing, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showing_id' })
  showing?: Showing;

  @Column({ type: 'integer' })
  row: number;

  @Column({ type: 'integer' })
  seat: number;
}
