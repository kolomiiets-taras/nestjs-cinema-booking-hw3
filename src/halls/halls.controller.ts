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
import { CreateHallDto } from './dto/create-hall.dto';
import { HallResponseDto, HallWithSeatsDto } from './dto/hall-response.dto';
import { HallsService } from './halls.service';

@ApiTags('halls')
@Controller('halls')
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @ApiCreatedResponse({ type: HallResponseDto, description: 'Зал створено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле відсутнє, має неправильний тип або не є цілим додатним',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Зал з такою назвою вже існує',
  })
  create(@Body() dto: CreateHallDto): Promise<HallResponseDto> {
    return this.hallsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [HallResponseDto], description: 'Зали за назвою' })
  findAll(): Promise<HallResponseDto[]> {
    return this.hallsService.findAll();
  }

  @Get(':id')
  @ApiObjectIdParam('id залу')
  @ApiOkResponse({
    type: HallWithSeatsDto,
    description: 'Зал з переліком усіх місць',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Зал не знайдено',
  })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<HallWithSeatsDto> {
    return this.hallsService.findOneWithSeats(id);
  }

  @Delete(':id')
  @ApiObjectIdParam('id залу')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Зал видалено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Зал не знайдено',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'У залі є сеанси',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.hallsService.remove(id);
  }
}
