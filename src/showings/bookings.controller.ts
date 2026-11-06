import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('bookings')
  @ApiOkResponse({
    type: [BookingResponseDto],
    description: 'Усі бронювання',
  })
  findAll(): Promise<BookingResponseDto[]> {
    return this.bookingsService.findAll();
  }

  @Post('showings/:id/bookings')
  @ApiCreatedResponse({
    type: BookingResponseDto,
    description: 'Бронювання створено (одна транзакція: бронювання + місця)',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Масив місць порожній, елемент без row/seat, місце повторюється або не існує в залі',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Хоча б одне місце вже зайняте — не бронюється жодне',
  })
  create(
    @Param('id', ParseUUIDPipe) showingId: string,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(showingId, dto);
  }

  @Get('showings/:id/bookings')
  @ApiOkResponse({
    type: [BookingResponseDto],
    description: 'Бронювання сеансу',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  findByShowing(
    @Param('id', ParseUUIDPipe) showingId: string,
  ): Promise<BookingResponseDto[]> {
    return this.bookingsService.findByShowing(showingId);
  }

  @Delete('bookings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Бронювання скасовано, місця звільнено',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Бронювання не знайдено',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.bookingsService.remove(id);
  }
}
