import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';
import { FilmsService } from './films.service';

@ApiTags('films')
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Post()
  @ApiCreatedResponse({ type: Film, description: 'Фільм створено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле відсутнє або має неправильний тип',
  })
  create(@Body() dto: CreateFilmDto): Promise<Film> {
    return this.filmsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [Film], description: 'Фільми за назвою' })
  findAll(): Promise<Film[]> {
    return this.filmsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: Film })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Film> {
    return this.filmsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Film, description: 'Оновлений фільм' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле має неправильний тип або id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilmDto,
  ): Promise<Film> {
    return this.filmsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Фільм видалено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Для фільму існують сеанси',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.filmsService.remove(id);
  }
}
