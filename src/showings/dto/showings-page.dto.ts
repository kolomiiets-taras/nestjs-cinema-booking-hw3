import { ApiProperty } from '@nestjs/swagger';
import { ShowingResponseDto } from './showing-response.dto';

/** One page of the schedule: GET /showings. */
export class ShowingsPageDto {
  @ApiProperty({
    type: [ShowingResponseDto],
    description: 'Сеанси поточної сторінки з назвою фільму й назвою залу',
  })
  items: ShowingResponseDto[];

  @ApiProperty({
    example: 42,
    description: 'Загальна кількість сеансів, що відповідають фільтрам',
  })
  total: number;

  @ApiProperty({ example: 1, description: 'Номер поточної сторінки' })
  page: number;

  @ApiProperty({ example: 20, description: 'Розмір сторінки' })
  limit: number;
}
