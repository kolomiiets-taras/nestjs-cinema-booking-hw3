import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { BookingsService } from './bookings.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { SeatStateDto } from './dto/seat-state.dto';
import { ShowingResponseDto } from './dto/showing-response.dto';
import { ShowingsPageDto } from './dto/showings-page.dto';
import { ShowingsQueryDto } from './dto/showings-query.dto';
import { ShowingsService } from './showings.service';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(
    private readonly showingsService: ShowingsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: ShowingResponseDto,
    description: 'Сеанс створено',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Фільм або зал не існує; startsAt не ISO 8601 або в минулому; price не ціле додатне',
  })
  create(@Body() dto: CreateShowingDto): Promise<ShowingResponseDto> {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOkResponse({
    type: ShowingsPageDto,
    description:
      'Сторінка розкладу: сеанси за startsAt (sort), при рівності — за id; total — кількість за фільтрами',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'page або limit не ціле число чи поза межами; date не у форматі YYYY-MM-DD; sort не asc/desc; filmId не UUID',
  })
  findAll(@Query() query: ShowingsQueryDto): Promise<ShowingsPageDto> {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ShowingResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShowingResponseDto> {
    return this.showingsService.findOneView(id);
  }

  @Get(':id/seats')
  @ApiOkResponse({
    type: [SeatStateDto],
    description: 'Усі місця залу з позначкою зайнятості',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  getSeats(@Param('id', ParseUUIDPipe) id: string): Promise<SeatStateDto[]> {
    return this.bookingsService.getSeatMap(id);
  }
}
