import { IsString } from 'class-validator';

export class CreatePreparedAuthorizationDto {
  @IsString()
  productId: string;
}
