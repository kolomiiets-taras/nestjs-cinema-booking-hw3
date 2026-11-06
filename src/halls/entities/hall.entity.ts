import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Showing } from '../../showings/entities/showing.entity';

/** Seats are not stored: the list is derived from rows × seatsPerRow. */
@Entity('halls')
export class Hall {
  @ApiProperty({
    format: 'uuid',
    example: '9b2d7c1a-5e3f-4a8b-8c6d-2f1e0a9b7c55',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Red Hall', description: 'Унікальна назва залу' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @ApiProperty({ example: 3 })
  @Column({ type: 'integer' })
  rows: number;

  @ApiProperty({ example: 5 })
  @Column({ name: 'seats_per_row', type: 'integer' })
  seatsPerRow: number;

  @OneToMany(() => Showing, (showing) => showing.hall)
  showings?: Showing[];
}
