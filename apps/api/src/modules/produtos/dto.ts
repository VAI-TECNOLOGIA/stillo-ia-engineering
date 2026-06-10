import { PartialType } from '@nestjs/swagger';
import { ProdutoRelacaoTipo, ProdutoStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateProdutoDto {
  @IsString() @MaxLength(80) sku!: string;
  @IsString() @MaxLength(200) nome!: string;
  @IsString() @MaxLength(60) categoria!: string;

  @IsOptional() @IsString() fabricante?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() unidade?: string;

  @IsOptional() @IsNumber() @Min(0) preco?: number;

  @IsOptional() @IsEnum(ProdutoStatus) status?: ProdutoStatus;
  @IsOptional() @IsObject() especificacoes?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;
}

export class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

export class QueryProdutoDto extends PaginationQueryDto {
  @IsOptional() @IsString() categoria?: string;
}

export class RelacaoDto {
  @IsString() relacionadoId!: string;
  @IsEnum(ProdutoRelacaoTipo) tipo!: ProdutoRelacaoTipo;
  @IsOptional() @IsString() nota?: string;
}
