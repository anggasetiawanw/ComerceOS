import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { Paginated } from '../../../../shared/presentation/dto/paginated.dto';
import { CurrentStore } from '../../../store/presentation/decorators/current-store.decorator';
import { CurrentStorePayload, StoreOwnerGuard } from '../../../store/presentation/guards/store-owner.guard';
import { ProductService } from '../../application/services/product.service';
import { CreateProductDto } from '../dto/requests/create-product.dto';
import { UpdateProductDto } from '../dto/requests/update-product.dto';
import { ListProductsQueryDto } from '../dto/requests/list-products.query.dto';
import { ProductResponseDto } from '../dto/responses/product-response.dto';

@ApiTags('products')
@Controller('products')
@UseGuards(StoreOwnerGuard)
export class ProductsController {
  constructor(private readonly products: ProductService) {}

  @Get()
  async list(
    @CurrentStore() store: CurrentStorePayload,
    @Query() query: ListProductsQueryDto,
  ): Promise<Paginated<ProductResponseDto>> {
    const result = await this.products.list(store.id, {
      status: query.status,
      productType: query.productType,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return Paginated.of(
      result.items.map((product) => ProductResponseDto.fromDomain(product)),
      { page: query.page, limit: query.limit, total: result.total },
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentStore() store: CurrentStorePayload,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const result = await this.products.create(store.id, dto);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Get(':id')
  async getById(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.products.getById(store.id, id);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Patch(':id')
  async update(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const result = await this.products.update(store.id, id, dto);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post(':id/publish')
  async publish(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.products.publish(store.id, id);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post(':id/archive')
  async archive(
    @CurrentStore() store: CurrentStorePayload,
    @Param('id') id: string,
  ): Promise<ProductResponseDto> {
    const result = await this.products.archive(store.id, id);
    return ProductResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
