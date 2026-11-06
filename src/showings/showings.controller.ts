import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiObjectIdParam } from '../common/swagger/api-object-id-param.decorator';
import { CreateShowingDto } from './dto/create-showing.dto';
import { SeatStateDto } from './dto/seat-state.dto';
import { ShowingResponseDto } from './dto/showing-response.dto';
import { ShowingsPageDto } from './dto/showings-page.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { ShowingsService } from './showings.service';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(private readonly showingsService: ShowingsService) {}

  @Post()
  @ApiCreatedResponse({
    type: ShowingResponseDto,
    description:
      'Сеанс створено (масиви seats і bookings у відповідь не входять)',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Фільм або зал не існує; filmId/hallId не ObjectId; startsAt не ISO 8601 або в минулому; price не ціле додатне',
  })
  create(@Body() dto: CreateShowingDto): Promise<ShowingResponseDto> {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOkResponse({
    type: ShowingsPageDto,
    description:
      'Сторінка розкладу без масивів seats і bookings: сеанси за startsAt (sort), при рівності — за _id; total — кількість за фільтрами',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'page або limit не ціле число чи поза межами; date не у форматі YYYY-MM-DD; sort не asc/desc; filmId не ObjectId',
  })
  findAll(@Query() query: ShowingsQueryDto): Promise<ShowingsPageDto> {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiObjectIdParam('id сеансу')
  @ApiOkResponse({
    type: ShowingResponseDto,
    description: 'Сеанс з назвами фільму й залу, без масивів seats і bookings',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ShowingResponseDto> {
    return this.showingsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiObjectIdParam('id сеансу')
  @ApiOkResponse({
    type: [SeatStateDto],
    description: 'Усі місця залу з позначкою зайнятості',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  getSeats(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<SeatStateDto[]> {
    return this.showingsService.getSeats(id);
  }
}
