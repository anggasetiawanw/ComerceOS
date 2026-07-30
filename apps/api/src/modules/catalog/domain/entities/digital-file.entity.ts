import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Result } from '../../../../shared/kernel/result';

export class DigitalFileError extends Error {}

export interface DigitalFileProps {
  productId: string;
  filePath: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  maxDownloads: number;
  createdAt: Date;
}

export class DigitalFile extends Entity<DigitalFileProps> {
  private constructor(props: DigitalFileProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: {
    productId: string;
    filePath: string;
    fileName: string;
    sizeBytes: number;
    contentType: string;
    maxDownloads: number;
  }): Result<DigitalFile, DigitalFileError> {
    if (params.filePath.trim().length === 0) {
      return Result.err(new DigitalFileError('File path cannot be empty'));
    }
    if (params.fileName.trim().length === 0) {
      return Result.err(new DigitalFileError('File name cannot be empty'));
    }
    if (!Number.isInteger(params.sizeBytes) || params.sizeBytes <= 0) {
      return Result.err(new DigitalFileError(`Size must be a positive integer, got ${params.sizeBytes}`));
    }
    if (!Number.isInteger(params.maxDownloads) || params.maxDownloads <= 0) {
      return Result.err(new DigitalFileError(`Max downloads must be a positive integer, got ${params.maxDownloads}`));
    }

    return Result.ok(
      new DigitalFile({
        productId: params.productId,
        filePath: params.filePath,
        fileName: params.fileName,
        sizeBytes: params.sizeBytes,
        contentType: params.contentType,
        maxDownloads: params.maxDownloads,
        createdAt: new Date(),
      }),
    );
  }

  static reconstitute(props: DigitalFileProps, id: UniqueId): DigitalFile {
    return new DigitalFile(props, id);
  }

  get productId(): string {
    return this.props.productId;
  }

  get filePath(): string {
    return this.props.filePath;
  }

  get fileName(): string {
    return this.props.fileName;
  }

  get sizeBytes(): number {
    return this.props.sizeBytes;
  }

  get contentType(): string {
    return this.props.contentType;
  }

  get maxDownloads(): number {
    return this.props.maxDownloads;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
