import { Module } from '@nestjs/common';
import { WastesController } from './wastes.controller';
import { WastesService } from './wastes.service';

@Module({
  controllers: [WastesController],
  providers: [WastesService],
  exports: [WastesService],
})
export class WastesModule {}
