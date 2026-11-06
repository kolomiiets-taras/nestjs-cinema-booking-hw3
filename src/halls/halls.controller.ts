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
import { CreateHallDto } from './dto/create-hall.dto';
import { HallWithSeatsDto } from './dto/hall-with-seats.dto';
import { Hall } from './entities/hall.entity';
import { HallsService } from './halls.service';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @ApiCreatedResponse({ type: Hall, description: 'Зал створено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле відсутнє, має неправильний тип або не є цілим додатним',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Зал з такою назвою вже існує',
  })
  create(@Body() dto: CreateHallDto): Promise<Hall> {
    return this.hallsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [Hall], description: 'Зали за назвою' })
  findAll(): Promise<Hall[]> {
    return this.hallsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    type: HallWithSeatsDto,
    description: 'Зал з переліком усіх місць',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Зал не знайдено',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<HallWithSeatsDto> {
    return this.hallsService.findOneWithSeats(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Зал видалено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Зал не знайдено',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'У залі є сеанси',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.hallsService.remove(id);
  }
}
