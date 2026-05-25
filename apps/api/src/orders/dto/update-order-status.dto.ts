import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT', 'DELIVERED', 'PAID'])
  status: string;
}
