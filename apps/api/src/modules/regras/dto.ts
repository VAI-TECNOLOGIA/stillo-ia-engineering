import { PartialType } from '@nestjs/swagger';
import { RegraCategoria } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRegraDto {
  @IsString()
  @MaxLength(160)
  nome!: string;

  @IsEnum(RegraCategoria)
  categoria!: RegraCategoria;

  @IsOptional() @IsString() @MaxLength(500) descricao?: string;

  @IsOptional() @IsInt() @Min(0) prioridade?: number;

  @IsOptional() @IsBoolean() ativo?: boolean;

  /** Condição (QUANDO). Ex.: { "todas": [{ "fato": "...", "op": ">=", "valor": 6 }] } */
  @IsObject()
  quando!: Record<string, unknown>;

  /** Ações (ENTÃO). Ex.: [{ "tipo": "ADICIONAR_ITEM", ... }] */
  @IsArray()
  entao!: unknown[];
}

export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
