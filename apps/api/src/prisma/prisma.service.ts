import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private isResetting = false;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  getColombiaTodayStr(): string {
    const now = new Date();
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    return colombiaTime.toISOString().split('T')[0]; // "YYYY-MM-DD"
  }

  async checkAndResetDailyStock() {
    if (this.isResetting) return;

    const todayStr = this.getColombiaTodayStr();

    try {
      const lastResetConfig = await this.appConfig.findUnique({
        where: { key: 'last_stock_reset_date' },
      });

      if (!lastResetConfig || lastResetConfig.value !== todayStr) {
        this.isResetting = true;

        // Reset all vitrina stocks to 0 and clear daily stock date
        await this.vitrinaStock.updateMany({
          data: { qty: 0, lastStockDate: null },
        });

        // Save today's date as the last reset date
        await this.appConfig.upsert({
          where: { key: 'last_stock_reset_date' },
          create: { key: 'last_stock_reset_date', value: todayStr },
          update: { value: todayStr },
        });

        console.log(`[DailyStockReset] Vitrina stocks reset to 0 for date: ${todayStr}`);
      }
    } catch (err) {
      console.error('[DailyStockReset] Error resetting stock:', err);
    } finally {
      this.isResetting = false;
    }
  }
}
