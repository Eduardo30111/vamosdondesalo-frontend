import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsEnum(['OWN', 'SUPPLIER'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyStock?: number;
}
