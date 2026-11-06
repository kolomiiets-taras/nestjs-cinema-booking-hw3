import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Film } from '../../films/entities/film.entity';
import { Hall } from '../../halls/entities/hall.entity';
import { Booking } from './booking.entity';

@Entity('showings')
@Index('IDX_showings_starts_at_id', ['startsAt', 'id'])
export class Showing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_showings_film_id')
  @Column({ name: 'film_id', type: 'uuid' })
  filmId: string;

  // A film with showings must not disappear together with them: deletion is restricted.
  @ManyToOne(() => Film, (film) => film.showings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'film_id' })
  film?: Film;

  @Index('IDX_showings_hall_id')
  @Column({ name: 'hall_id', type: 'uuid' })
  hallId: string;

  @ManyToOne(() => Hall, (hall) => hall.showings, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'hall_id' })
  hall?: Hall;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  /** Ticket price in kopecks (125 UAH = 12500). */
  @Column({ type: 'integer' })
  price: number;

  @OneToMany(() => Booking, (booking) => booking.showing)
  bookings?: Booking[];
}
