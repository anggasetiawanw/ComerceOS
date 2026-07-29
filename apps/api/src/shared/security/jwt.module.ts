import { Global, Module } from '@nestjs/common';
import { AppJwtService } from './jwt.service';

@Global()
@Module({
  providers: [AppJwtService],
  exports: [AppJwtService],
})
export class AppJwtModule {}
