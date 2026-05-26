import { Module } from '@nestjs/common';
import { KitchenProductionController } from './kitchen-production.controller';
import { KitchenProductionService } from './kitchen-production.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [KitchenProductionController],
  providers: [KitchenProductionService],
  exports: [KitchenProductionService],
})
export class KitchenProductionModule {}
