import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApiObjectIdParam } from '../common/swagger/api-object-id-param.decorator';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { FilmResponseDto } from './dto/film-response.dto';
import { FilmsService } from './films.service';

@ApiTags('films')
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Post()
  @ApiCreatedResponse({ type: FilmResponseDto, description: 'Фільм створено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле відсутнє або має неправильний тип',
  })
  create(@Body() dto: CreateFilmDto): Promise<FilmResponseDto> {
    return this.filmsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [FilmResponseDto], description: 'Фільми за назвою' })
  findAll(): Promise<FilmResponseDto[]> {
    return this.filmsService.findAll();
  }

  @Get(':id')
  @ApiObjectIdParam('id фільму')
  @ApiOkResponse({ type: FilmResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<FilmResponseDto> {
    return this.filmsService.findOne(id);
  }

  @Patch(':id')
  @ApiObjectIdParam('id фільму')
  @ApiOkResponse({ type: FilmResponseDto, description: 'Оновлений фільм' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Поле має неправильний тип або id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateFilmDto,
  ): Promise<FilmResponseDto> {
    return this.filmsService.update(id, dto);
  }

  @Delete(':id')
  @ApiObjectIdParam('id фільму')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Фільм видалено' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id не є ObjectId',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Фільм не знайдено',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Для фільму існують сеанси',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    return this.filmsService.remove(id);
  }
}
