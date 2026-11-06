import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowingsModule } from '../showings/showings.module';
import { Hall } from './entities/hall.entity';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hall]), forwardRef(() => ShowingsModule)],
  controllers: [HallsController],
  providers: [HallsService],
  exports: [HallsService],
})
export class HallsModule {}
