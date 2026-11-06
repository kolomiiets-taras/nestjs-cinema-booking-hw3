import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowingsModule } from '../showings/showings.module';
import { Film } from './entities/film.entity';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';

@Module({
  imports: [TypeOrmModule.forFeature([Film]), forwardRef(() => ShowingsModule)],
  controllers: [FilmsController],
  providers: [FilmsService],
  exports: [FilmsService],
})
export class FilmsModule {}
