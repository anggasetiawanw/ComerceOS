import {
  Controller,
  Delete,
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
import { ImageFileValidator } from '../../../../shared/presentation/pipes/image-file.validator';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { ProductMediaService } from '../../application/services/product-media.service';
import { ProductResponseDto } from '../dto/responses/product-response.dto';

const PRODUCT_IMAGE_MAX_BYTES = 5_242_880;

@ApiTags('products')
@Controller('products/:id/images')
@UseGuards(StoreOwnerGuard)
export class ProductImagesController {
  constructor(private readonly media: ProductMediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: PRODUCT_IMAGE_MAX_BYTES }), new ImageFileValidator()],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    const result = await this.media.uploadImage(store.id, id, { buffer: file.buffer, mimetype: file.mimetype });
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Delete(':imageId')
  async remove(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<ProductResponseDto> {
    const result = await this.media.removeImage(store.id, id, imageId);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
