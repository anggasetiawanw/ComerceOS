import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { DigitalFileValidator } from '../../../../shared/presentation/pipes/digital-file.validator';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { DigitalFileService } from '../../application/services/digital-file.service';
import { DigitalFileResponseDto } from '../dto/responses/digital-file-response.dto';

const DIGITAL_FILE_MAX_BYTES = 52_428_800;

@ApiTags('products')
@Controller('products/:id/files')
@UseGuards(StoreOwnerGuard)
export class DigitalFilesController {
  constructor(private readonly digitalFiles: DigitalFileService) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<DigitalFileResponseDto[]> {
    const result = await this.digitalFiles.list(store.id, id);
    return unwrapOrThrow(result).map((file) => DigitalFileResponseDto.fromDomain(file));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: DIGITAL_FILE_MAX_BYTES }), new DigitalFileValidator()],
      }),
    )
    file: Express.Multer.File,
  ): Promise<DigitalFileResponseDto> {
    const result = await this.digitalFiles.upload(store.id, id, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    return DigitalFileResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ): Promise<void> {
    unwrapOrThrow(await this.digitalFiles.remove(store.id, id, fileId));
  }
}
