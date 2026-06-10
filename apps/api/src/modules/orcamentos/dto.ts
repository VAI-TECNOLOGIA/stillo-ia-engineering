import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarOrcamentoDto {
  @IsString() obraId!: string;
}

export class AtualizarItemDto {
  @IsOptional() @IsString() produtoId?: string;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsNumber() @Min(0) quantidade?: number;
  @IsOptional() @IsNumber() @Min(0) precoUnit?: number;
  @IsOptional() @IsString() justificativa?: string;
}

export class AdicionarItemDto {
  @IsString() descricao!: string;
  @IsNumber() @Min(0) quantidade!: number;
  @IsNumber() @Min(0) precoUnit!: number;
  @IsOptional() @IsString() produtoId?: string;
  @IsOptional() @IsString() piscinaId?: string;
  @IsOptional() @IsString() justificativa?: string;
}

export class CompararDto {
  @IsInt() a!: number;
  @IsInt() b!: number;
}
