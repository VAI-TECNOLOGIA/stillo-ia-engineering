import { IsObject, IsOptional, IsString } from 'class-validator';

export class DispararLeituraDto {
  @IsOptional()
  @IsString()
  arquivoId?: string; // se omitido, usa o arquivo mais recente da obra
}

export class CorrigirLeituraDto {
  /** ProjetoExtraido corrigido pelo humano (validado com Zod no service). */
  @IsObject()
  resultado!: Record<string, unknown>;
}
