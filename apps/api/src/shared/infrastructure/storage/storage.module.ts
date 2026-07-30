import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { STORAGE_UPLOADER, StorageUploader } from './storage-uploader.port';
import { SupabaseStorageService } from './supabase-storage.service';
import { FilesystemStorageUploader } from './filesystem-storage.service';
import { NullStorageUploader } from './null-storage.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    SupabaseStorageService,
    FilesystemStorageUploader,
    NullStorageUploader,
    {
      provide: STORAGE_UPLOADER,
      inject: [AppConfigService, SupabaseStorageService, FilesystemStorageUploader, NullStorageUploader],
      useFactory: (
        config: AppConfigService,
        supabase: SupabaseStorageService,
        filesystem: FilesystemStorageUploader,
        nullUploader: NullStorageUploader,
      ): StorageUploader => {
        if (config.isStorageConfigured) return supabase;
        if (!config.isProduction) return filesystem;
        return nullUploader;
      },
    },
  ],
  exports: [STORAGE_UPLOADER],
})
export class StorageModule {}
