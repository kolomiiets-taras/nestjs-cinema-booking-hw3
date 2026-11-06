import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilmsModule } from '../films/films.module';
import { HallsModule } from '../halls/halls.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingSeat } from './entities/booking-seat.entity';
import { Booking } from './entities/booking.entity';
import { Showing } from './entities/showing.entity';
import { ShowingsController } from './showings.controller';
import { ShowingsService } from './showings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Showing, Booking, BookingSeat]),
    forwardRef(() => FilmsModule),
    forwardRef(() => HallsModule),
  ],
  controllers: [ShowingsController, BookingsController],
  providers: [ShowingsService, BookingsService],
  exports: [ShowingsService],
})
export class ShowingsModule {}
