import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import type { BaseDisciplineExtractor } from './base.extractor';
import { ArchitecturalExtractor } from './architectural.extractor';
import { HydraulicExtractor } from './hydraulic.extractor';
import { ElectricalExtractor } from './electrical.extractor';
import { DetailExtractor } from './detail.extractor';
import { EquipmentExtractor } from './equipment.extractor';
import { StructuralExtractor } from './structural.extractor';
import { MemorialExtractor } from './memorial.extractor';

/**
 * Registry: DocumentType → extrator especializado.
 * DESCONHECIDO não tem extrator: vira pendência de classificação manual
 * (nunca extrair às cegas — princípio anti-inferência).
 */
@Injectable()
export class ExtractorRegistry {
  private readonly mapa: Partial<Record<DocumentType, BaseDisciplineExtractor<unknown>>>;

  constructor(
    architectural: ArchitecturalExtractor,
    hydraulic: HydraulicExtractor,
    electrical: ElectricalExtractor,
    detail: DetailExtractor,
    equipment: EquipmentExtractor,
    structural: StructuralExtractor,
    memorial: MemorialExtractor,
  ) {
    this.mapa = {
      ARQUITETONICO: architectural,
      IMPLANTACAO: architectural,   // geometria/áreas — mesmo escopo arquitetônico
      LAZER: architectural,
      PAISAGISMO: architectural,
      HIDRAULICO: hydraulic,
      ELETRICO: electrical,
      CORTES: detail,
      DETALHES_EXECUTIVOS: detail,  // cotas verticais e detalhes — mesmo escopo de cortes
      EQUIPAMENTOS: equipment,
      CASA_DE_MAQUINAS: equipment,  // listas de equipamentos da CM
      ESTRUTURAL: structural,
      MEMORIAL_DESCRITIVO: memorial,
      // DESCONHECIDO: sem extrator (proposital)
    };
  }

  get(tipo: DocumentType): BaseDisciplineExtractor<unknown> | null {
    return this.mapa[tipo] ?? null;
  }
}
