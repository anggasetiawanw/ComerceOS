export class DownloadUrlResponseDto {
  url!: string;
  fileName!: string;

  static fromResult(result: { url: string; fileName: string }): DownloadUrlResponseDto {
    const dto = new DownloadUrlResponseDto();
    dto.url = result.url;
    dto.fileName = result.fileName;
    return dto;
  }
}
