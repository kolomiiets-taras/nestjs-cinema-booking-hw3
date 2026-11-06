import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';

@Entity('films')
export class Film {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c2b0e-7a52-4d7e-9b8a-0c8f2e6d1a11',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Dune: Part Two' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 166, description: 'Тривалість у хвилинах' })
  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes: number;

  @ApiProperty({ example: 2024 })
  @Column({ name: 'release_year', type: 'integer' })
  releaseYear: number;

  @OneToMany(() => Showing, (showing) => showing.film)
  showings?: Showing[];
}
