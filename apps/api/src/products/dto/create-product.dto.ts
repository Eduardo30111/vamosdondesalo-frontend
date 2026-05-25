import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsEnum(['OWN', 'SUPPLIER'])
  type: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsNumber()
  @Min(0)
  dailyStock: number;
}
