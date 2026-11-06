import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiObjectIdParam } from '../common/swagger/api-object-id-param.decorator';
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
    description: 'Усі бронювання, зібрані з документів усіх сеансів',
  })
  findAll(): Promise<BookingResponseDto[]> {
    return this.bookingsService.findAll();
  }

  @Post('showings/:id/bookings')
  @ApiObjectIdParam('id сеансу')
  @ApiCreatedResponse({
    type: BookingResponseDto,
    description: 'Бронювання створено одним оновленням документа сеансу',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'id не є ObjectId; масив місць порожній, елемент без row/seat, місце повторюється або не існує в залі',
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
    @Param('id', ParseObjectIdPipe) showingId: string,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.create(showingId, dto);
  }

  @Get('showings/:id/bookings')
  @ApiObjectIdParam('id сеансу')
  @ApiOkResponse({
    type: [BookingResponseDto],
    description: 'Бронювання сеансу',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Сеанс не знайдено',
  })
  findByShowing(
    @Param('id', ParseObjectIdPipe) showingId: string,
  ): Promise<BookingResponseDto[]> {
    return this.bookingsService.findByShowing(showingId);
  }

  @Delete('bookings/:id')
  @ApiObjectIdParam('id бронювання')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Бронювання скасовано, місця звільнено',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Бронювання не знайдено',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.bookingsService.remove(id);
  }
}
