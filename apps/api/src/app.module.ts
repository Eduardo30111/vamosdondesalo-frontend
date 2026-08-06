import { Module } from '@nestjs/common';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PublicModule } from './public/public.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { CustomersModule } from './customers/customers.module';
import { WastesModule } from './wastes/wastes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AccountingModule } from './accounting/accounting.module';
import { AppConfigModule } from './app-config/app-config.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { PreparedAuthorizationsModule } from './prepared-authorizations/prepared-authorizations.module';
import { StoresModule } from './stores/stores.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SuppliersModule,
    TablesModule,
    OrdersModule,
    PaymentsModule,
    RealtimeModule,
    PublicModule,
    DashboardModule,
    DeliveryZonesModule,
    CustomersModule,
    PreparedAuthorizationsModule,
    WastesModule,
    ExpensesModule,
    AccountingModule,
    AppConfigModule,
    UploadModule,
    HealthModule,
    ProductionOrdersModule,
    StoresModule,
    ChatbotModule,
  ],
})
export class AppModule {}
