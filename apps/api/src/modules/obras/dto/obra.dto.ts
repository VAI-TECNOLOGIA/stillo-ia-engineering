import { PartialType } from '@nestjs/swagger';
import { ObraStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateObraDto {
  @IsString()
  clienteId!: string;

  @IsString()
  @MaxLength(200)
  nome!: string;

  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() @MaxLength(2) uf?: string;
  @IsOptional() @IsString() regiao?: string;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;

  @IsOptional()
  @IsEnum(ObraStatus)
  status?: ObraStatus;
}

export class UpdateObraDto extends PartialType(CreateObraDto) {}

export class QueryObraDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  clienteId?: string;
}
