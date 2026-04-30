import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { FxController } from './fx.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FxMockProviderService } from './mockProvider.service';
import { RateService } from './rate.service';

@Module({
  imports: [PrismaModule],
  providers: [FxService, FxMockProviderService, RateService],
  controllers: [FxController]
})
export class FxModule {}
