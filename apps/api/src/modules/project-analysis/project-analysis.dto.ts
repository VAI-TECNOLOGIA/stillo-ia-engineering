import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class ReclassificarDocumentoDto {
  /** Classificação manual quando o classificador devolve DESCONHECIDO ou erra. */
  @IsEnum(DocumentType)
  documentType!: DocumentType;
}

export class ResolverPendenciaDto {
  /** Nome do corpo d'água ou alvo do conflito (ex.: "Piscina Adulto"). */
  @IsString()
  @IsNotEmpty()
  alvo!: string;

  /** Campo a resolver. */
  @IsIn(['areaM2', 'comprimentoM', 'larguraM', 'profundidadeMinM', 'profundidadeMaxM', 'volumeM3'])
  campo!: 'areaM2' | 'comprimentoM' | 'larguraM' | 'profundidadeMinM' | 'profundidadeMaxM' | 'volumeM3';

  /** Valor decidido pelo humano (vira evidência com fonte CONFIRMACAO_HUMANA). */
  @IsNumber()
  valor!: number;

  @IsOptional()
  @IsString()
  justificativa?: string;
}
