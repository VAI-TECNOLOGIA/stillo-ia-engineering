import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ContatoDto {
  @IsString()
  tipo!: string; // 'telefone' | 'email' | 'whatsapp'

  @IsString()
  valor!: string;
}

export class CreateClienteDto {
  @IsString()
  @MaxLength(200)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  documento?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContatoDto)
  contatos?: ContatoDto[];

  @IsOptional()
  @IsObject()
  endereco?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}

export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
