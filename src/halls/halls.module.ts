import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowingsModule } from '../showings/showings.module';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';
import { Hall, HallSchema } from './schemas/hall.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hall.name, schema: HallSchema }]),
    forwardRef(() => ShowingsModule),
  ],
  controllers: [HallsController],
  providers: [HallsService],
  exports: [HallsService],
})
export class HallsModule {}
