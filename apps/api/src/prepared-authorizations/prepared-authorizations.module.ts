import { Module } from '@nestjs/common';
import { PreparedAuthorizationsController } from './prepared-authorizations.controller';
import { PreparedAuthorizationsService } from './prepared-authorizations.service';

@Module({
  controllers: [PreparedAuthorizationsController],
  providers: [PreparedAuthorizationsService],
  exports: [PreparedAuthorizationsService],
})
export class PreparedAuthorizationsModule {}
