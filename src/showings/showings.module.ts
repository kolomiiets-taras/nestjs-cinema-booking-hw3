import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilmsModule } from '../films/films.module';
import { HallsModule } from '../halls/halls.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Showing, ShowingSchema } from './schemas/showing.schema';
import { ShowingsController } from './showings.controller';
import { ShowingsService } from './showings.service';

@Module({
  imports: [
    // Seats and bookings are embedded documents of a showing: one model covers all three.
    MongooseModule.forFeature([{ name: Showing.name, schema: ShowingSchema }]),
    forwardRef(() => FilmsModule),
    forwardRef(() => HallsModule),
  ],
  controllers: [ShowingsController, BookingsController],
  providers: [ShowingsService, BookingsService],
  exports: [ShowingsService],
})
export class ShowingsModule {}
