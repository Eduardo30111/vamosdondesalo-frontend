import { Module, forwardRef } from '@nestjs/common';
import { DailyStockController } from './daily-stock.controller';
import { DailyStockService } from './daily-stock.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [DailyStockController],
  providers: [DailyStockService],
  exports: [DailyStockService],
})
export class DailyStockModule {}
