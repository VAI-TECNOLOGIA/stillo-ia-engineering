import { Injectable } from '@nestjs/common';
import type { DocumentType } from '@prisma/client';
import { campoVazio, type CampoConsolidado, type EvidenciaBool, type EvidenciaNumero, type EvidenciaTexto } from './evidence.schema';
import type {
  Consolidacao, CorpoConsolidado, DocumentoAnalisado, EquipamentoConsolidado, SistemaConsolidado,
} from './consolidation.types';
import type {
  ExtracaoArquitetonica, ExtracaoCortes, ExtracaoEletrica, ExtracaoEquipamentos,
  ExtracaoHidraulica, ExtracaoMemorial, CorpoTipo,
} from './extraction.schemas';

/**
 * ETAPA 4 — CONSOLIDADOR.
 * Une as análises independentes de cada documento num projeto único:
 *  - Arquitetônico dá áreas/dimensões; Cortes dá profundidades; Hidráulico dá
 *    bombas/filtros; Elétrico dá iluminação; Memorial corrobora tudo por escrito.
 *  - NUNCA sobrescreve: valores compatíveis somam fontes; divergentes viram CONFLITO.
 *  - NUNCA calcula: volume só entra se evidenciado (memorial).
 */
@Injectable()
export class ProjectConsolidatorService {
  consolidar(documentos: DocumentoAnalisado[]): Consolidacao {
    const c: Consolidacao = {
      corposDagua: [],
      equipamentos: [],
      sistemas: [],
      deckAreaM2: campoVazio<number>(),
      sauna: campoVazio<boolean>(),
      bordaInfinita: campoVazio<boolean>(),
      revestimentos: [],
      disciplinasPresentes: [],
      documentos: documentos.map((d) => ({ nomeArquivo: d.nomeArquivo, documentType: d.documentType, comErro: !!d.erro || d.extracao === null })),
      conflitos: [],
    };

    for (const doc of documentos) {
      if (!doc.extracao) continue;
      if (!c.disciplinasPresentes.includes(doc.documentType)) c.disciplinasPresentes.push(doc.documentType);

      switch (doc.documentType) {
        case 'ARQUITETONICO': case 'IMPLANTACAO': case 'LAZER': case 'PAISAGISMO':
          this.aplicarArquitetonico(c, doc, doc.extracao as ExtracaoArquitetonica); break;
        case 'CORTES': case 'DETALHES_EXECUTIVOS':
          this.aplicarCortes(c, doc, doc.extracao as ExtracaoCortes); break;
        case 'HIDRAULICO':
          this.aplicarHidraulico(c, doc, doc.extracao as ExtracaoHidraulica); break;
        case 'ELETRICO':
          this.aplicarEletrico(c, doc, doc.extracao as ExtracaoEletrica); break;
        case 'EQUIPAMENTOS': case 'CASA_DE_MAQUINAS':
          this.aplicarEquipamentos(c, doc, doc.extracao as ExtracaoEquipamentos); break;
        case 'MEMORIAL_DESCRITIVO':
          this.aplicarMemorial(c, doc, doc.extracao as ExtracaoMemorial); break;
        default: break; // DESCONHECIDO: nunca consolidar às cegas
      }
    }

    this.derivarSistemas(c);
    return c;
  }

  // ── mescla de campo com evidência (nunca sobrescreve) ─────────────────────

  private mesclar<T extends number | string | boolean>(
    c: Consolidacao,
    campo: CampoConsolidado<T>,
    nomeCampo: string,
    alvo: string,
    doc: DocumentoAnalisado,
    evid: { valor: T | null; fonte: string | null; pagina: number | null; status: string },
  ): void {
    if (evid.status !== 'CONFIRMADO' || evid.valor === null || evid.valor === undefined) return;

    const fonte = {
      documento: doc.nomeArquivo,
      documentType: doc.documentType as string,
      fonte: evid.fonte ?? 'documento',
      pagina: evid.pagina,
      valor: evid.valor,
    };

    if (campo.status === 'NAO_IDENTIFICADO') {
      campo.valor = evid.valor;
      campo.status = 'CONFIRMADO';
      campo.fontes.push(fonte);
      return;
    }

    if (this.compativel(campo.valor as T, evid.valor)) {
      campo.fontes.push(fonte); // corrobora — soma evidência
      return;
    }

    // Divergência: CONFLITO — preserva todas as fontes, anula o valor final
    campo.fontes.push(fonte);
    if (campo.status !== 'CONFLITO') {
      campo.status = 'CONFLITO';
      campo.valor = null;
    }
    c.conflitos.push({
      campo: nomeCampo,
      alvo,
      valores: campo.fontes.map((f) => ({ documento: f.documento, valor: f.valor })),
    });
  }

  private compativel(a: number | string | boolean, b: number | string | boolean): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      const tol = Math.max(0.01, Math.abs(a) * 0.005); // 0,5% ou 1cm/0.01
      return Math.abs(a - b) <= tol;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return this.norm(a) === this.norm(b);
    }
    return a === b;
  }

  private norm(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  // ── matching de corpos d'água entre disciplinas ───────────────────────────

  private corpo(c: Consolidacao, nome: string, tipoCorpo: CorpoTipo): CorpoConsolidado {
    // 1º: casa por tipo específico (PISCINA_ADULTO ↔ PISCINA_ADULTO)
    if (tipoCorpo !== 'DESCONHECIDO') {
      const porTipo = c.corposDagua.find((x) => x.tipoCorpo === tipoCorpo);
      if (porTipo) return porTipo;
    }
    // 2º: casa por nome normalizado
    const porNome = c.corposDagua.find((x) => this.norm(x.nome) === this.norm(nome));
    if (porNome) {
      if (porNome.tipoCorpo === 'DESCONHECIDO' && tipoCorpo !== 'DESCONHECIDO') porNome.tipoCorpo = tipoCorpo;
      return porNome;
    }
    // novo corpo
    const novo: CorpoConsolidado = {
      nome,
      tipoCorpo,
      areaM2: campoVazio(), comprimentoM: campoVazio(), larguraM: campoVazio(),
      profundidadeMinM: campoVazio(), profundidadeMaxM: campoVazio(),
      volumeM3: campoVazio(), formato: campoVazio(),
    };
    c.corposDagua.push(novo);
    return novo;
  }

  /** Detecta o tipo de corpo d'água por termos na referência textual de um corte. */
  private tipoPorReferencia(ref: string): CorpoTipo {
    const r = this.norm(ref);
    if (/infantil|crianca/.test(r)) return 'PISCINA_INFANTIL';
    if (/adulto/.test(r)) return 'PISCINA_ADULTO';
    if (/\bspa\b|ofuro/.test(r)) return 'SPA';
    if (/prainha|beach/.test(r)) return 'PRAINHA';
    if (/espelho/.test(r)) return 'ESPELHO_DAGUA';
    if (/piscina/.test(r)) return 'PISCINA_ADULTO'; // "piscina" sem qualificador = principal
    return 'DESCONHECIDO';
  }

  // ── aplicadores por disciplina ─────────────────────────────────────────────

  private aplicarArquitetonico(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoArquitetonica): void {
    for (const corpoEx of ex.corposDagua ?? []) {
      const corpo = this.corpo(c, corpoEx.nome, corpoEx.tipoCorpo);
      this.mesclar(c, corpo.areaM2, 'areaM2', corpo.nome, doc, corpoEx.areaM2 as EvidenciaNumero);
      this.mesclar(c, corpo.comprimentoM, 'comprimentoM', corpo.nome, doc, corpoEx.comprimentoM as EvidenciaNumero);
      this.mesclar(c, corpo.larguraM, 'larguraM', corpo.nome, doc, corpoEx.larguraM as EvidenciaNumero);
      this.mesclar(c, corpo.formato, 'formato', corpo.nome, doc, corpoEx.formato as EvidenciaTexto);
    }
    this.mesclar(c, c.deckAreaM2, 'deckAreaM2', 'deck', doc, ex.deckAreaM2 as EvidenciaNumero);
    this.mesclar(c, c.sauna, 'sauna', 'sauna', doc, ex.sauna as EvidenciaBool);
    this.mesclar(c, c.bordaInfinita, 'bordaInfinita', 'bordaInfinita', doc, ex.bordaInfinita as EvidenciaBool);
    for (const r of ex.revestimentos ?? []) {
      c.revestimentos.push({ local: r.local, descricao: r.descricao, documento: doc.nomeArquivo, fonte: r.fonte, pagina: r.pagina ?? null });
    }
  }

  private aplicarCortes(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoCortes): void {
    for (const p of ex.profundidades ?? []) {
      const tipo = this.tipoPorReferencia(p.referencia);
      const corpo = this.corpo(c, tipo === 'DESCONHECIDO' ? p.referencia : this.nomeCanonico(tipo), tipo);
      this.mesclar(c, corpo.profundidadeMinM, 'profundidadeMinM', corpo.nome, doc, p.profundidadeMinM as EvidenciaNumero);
      this.mesclar(c, corpo.profundidadeMaxM, 'profundidadeMaxM', corpo.nome, doc, p.profundidadeMaxM as EvidenciaNumero);
    }
  }

  private aplicarHidraulico(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoHidraulica): void {
    for (const b of ex.bombas ?? []) {
      this.addEquipamento(c, doc, 'BOMBA', b.descricao as EvidenciaTexto, null, b.quantidade as EvidenciaNumero,
        this.especBomba(b.potenciaCv as EvidenciaNumero, b.vazaoM3h as EvidenciaNumero));
    }
    for (const f of ex.filtros ?? []) {
      const espec = (f.diametroMm as EvidenciaNumero).valor ? `Ø${(f.diametroMm as EvidenciaNumero).valor}mm` : null;
      this.addEquipamento(c, doc, 'FILTRO', f.descricao as EvidenciaTexto, null, f.quantidade as EvidenciaNumero, espec);
    }
    const aq = ex.aquecimento;
    if (aq && (aq.existe as EvidenciaBool)?.valor === true) {
      this.addEquipamento(c, doc, 'AQUECEDOR', aq.tipo as EvidenciaTexto, null, { valor: null, fonte: null, pagina: null, status: 'NAO_IDENTIFICADO' },
        (aq.potencia as EvidenciaNumero).valor ? String((aq.potencia as EvidenciaNumero).valor) : null);
    }
  }

  private especBomba(pot: EvidenciaNumero, vazao: EvidenciaNumero): string | null {
    const partes: string[] = [];
    if (pot?.valor) partes.push(`${pot.valor}cv`);
    if (vazao?.valor) partes.push(`${vazao.valor}m³/h`);
    return partes.length ? partes.join(' · ') : null;
  }

  private aplicarEletrico(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoEletrica): void {
    for (const il of ex.iluminacao ?? []) {
      const espec = (il.potenciaW as EvidenciaNumero).valor ? `${(il.potenciaW as EvidenciaNumero).valor}W` : null;
      this.addEquipamento(c, doc, 'LED', il.tipo as EvidenciaTexto, null, il.quantidade as EvidenciaNumero, espec);
    }
  }

  private aplicarEquipamentos(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoEquipamentos): void {
    for (const eq of ex.equipamentos ?? []) {
      this.addEquipamento(c, doc, eq.categoria, eq.descricao as EvidenciaTexto, (eq.modelo as EvidenciaTexto).valor,
        eq.quantidade as EvidenciaNumero, (eq.especificacao as EvidenciaTexto).valor);
    }
  }

  private aplicarMemorial(c: Consolidacao, doc: DocumentoAnalisado, ex: ExtracaoMemorial): void {
    for (const corpoEx of ex.corposDagua ?? []) {
      const corpo = this.corpo(c, corpoEx.nome, corpoEx.tipoCorpo);
      this.mesclar(c, corpo.areaM2, 'areaM2', corpo.nome, doc, corpoEx.areaM2 as EvidenciaNumero);
      this.mesclar(c, corpo.volumeM3, 'volumeM3', corpo.nome, doc, corpoEx.volumeM3 as EvidenciaNumero);
      // memorial cita profundidade única → trata como min e max textuais
      this.mesclar(c, corpo.profundidadeMaxM, 'profundidadeMaxM', corpo.nome, doc, corpoEx.profundidadeM as EvidenciaNumero);
    }
    for (const s of ex.sistemas ?? []) {
      const desc = s.descricao as EvidenciaTexto;
      if (desc?.status === 'CONFIRMADO') {
        this.addSistema(c, this.normalizarSistema(s.sistema), doc, desc.fonte ?? 'MEMORIAL', desc.pagina ?? null);
      }
    }
  }

  // ── equipamentos e sistemas ────────────────────────────────────────────────

  private addEquipamento(
    c: Consolidacao, doc: DocumentoAnalisado, categoria: string,
    descricao: EvidenciaTexto, modelo: string | null, quantidade: EvidenciaNumero, especificacao: string | null,
  ): void {
    if (descricao?.status !== 'CONFIRMADO' && !modelo && quantidade?.status !== 'CONFIRMADO') return; // nada evidenciado

    const fonteNova = {
      documento: doc.nomeArquivo, documentType: doc.documentType as string,
      fonte: descricao?.fonte ?? quantidade?.fonte ?? 'documento', pagina: descricao?.pagina ?? quantidade?.pagina ?? null,
    };

    const chave = `${categoria}::${this.norm(descricao?.valor ?? modelo ?? '')}`;
    const existente = c.equipamentos.find((e) => `${e.categoria}::${this.norm(e.descricao ?? e.modelo ?? '')}` === chave && chave.split('::')[1] !== '');
    if (existente) {
      existente.fontes.push(fonteNova);
      if (!existente.modelo && modelo) existente.modelo = modelo;
      if (!existente.especificacao && especificacao) existente.especificacao = especificacao;
      if (quantidade?.status === 'CONFIRMADO' && quantidade.valor !== null) {
        this.mesclar(c, existente.quantidade, 'quantidade', `${categoria} ${existente.descricao ?? ''}`.trim(), doc, quantidade);
      }
      return;
    }

    const q = campoVazio<number>();
    if (quantidade?.status === 'CONFIRMADO' && quantidade.valor !== null) {
      q.valor = quantidade.valor; q.status = 'CONFIRMADO';
      q.fontes.push({ ...fonteNova, valor: quantidade.valor });
    }
    c.equipamentos.push({
      categoria,
      descricao: descricao?.valor ?? null,
      modelo,
      quantidade: q,
      especificacao,
      fontes: [fonteNova],
    });
  }

  private addSistema(c: Consolidacao, sistema: string, doc: DocumentoAnalisado, fonte: string, pagina: number | null): void {
    let s = c.sistemas.find((x) => x.sistema === sistema);
    if (!s) { s = { sistema, fontes: [] }; c.sistemas.push(s); }
    s.fontes.push({ documento: doc.nomeArquivo, documentType: doc.documentType as string, fonte, pagina });
  }

  private normalizarSistema(raw: string): string {
    const r = this.norm(raw);
    if (/filtra|bomba|motobomba/.test(r)) return 'FILTRAGEM';
    if (/led|ilumina|refletor/.test(r)) return 'LED';
    if (/aquec|calor|solar|trocador/.test(r)) return 'AQUECIMENTO';
    if (/hidro(massagem|jet)/.test(r)) return 'HIDROMASSAGEM';
    if (/cascata|lamina|queda/.test(r)) return 'CASCATA';
    if (/borda\s*infinita|overflow|transbord/.test(r)) return 'BORDA_INFINITA';
    if (/prainha|beach/.test(r)) return 'PRAINHA';
    if (/\bspa\b|ofuro/.test(r)) return 'SPA';
    if (/sauna|vapor/.test(r)) return 'SAUNA';
    if (/tratamento|clorador|salino|ozonio|uv/.test(r)) return 'TRATAMENTO';
    return raw.toUpperCase().slice(0, 30);
  }

  /**
   * Sistemas derivados de evidências DIRETAS já consolidadas (agregação, não inferência):
   * equipamento LED evidenciado → sistema LED; sauna true no arquitetônico → SAUNA; etc.
   */
  private derivarSistemas(c: Consolidacao): void {
    const fonteDe = (fontes: { documento: string; documentType: string; fonte: string; pagina: number | null }[]) => fontes[0];

    for (const eq of c.equipamentos) {
      const f = fonteDe(eq.fontes);
      if (!f) continue;
      const docFake = { nomeArquivo: f.documento, documentType: f.documentType as DocumentType } as DocumentoAnalisado;
      if (eq.categoria === 'BOMBA' || eq.categoria === 'FILTRO') this.addSistemaUnico(c, 'FILTRAGEM', docFake, f);
      if (eq.categoria === 'LED') this.addSistemaUnico(c, 'LED', docFake, f);
      if (eq.categoria === 'AQUECEDOR' || eq.categoria === 'TROCADOR_CALOR') this.addSistemaUnico(c, 'AQUECIMENTO', docFake, f);
      if (eq.categoria === 'CLORADOR' || eq.categoria === 'DOSADORA') this.addSistemaUnico(c, 'TRATAMENTO', docFake, f);
    }
    if (c.sauna.status === 'CONFIRMADO' && c.sauna.valor === true) {
      const f = c.sauna.fontes[0];
      this.addSistemaUnico(c, 'SAUNA', { nomeArquivo: f.documento, documentType: f.documentType as DocumentType } as DocumentoAnalisado, f);
    }
    if (c.bordaInfinita.status === 'CONFIRMADO' && c.bordaInfinita.valor === true) {
      const f = c.bordaInfinita.fontes[0];
      this.addSistemaUnico(c, 'BORDA_INFINITA', { nomeArquivo: f.documento, documentType: f.documentType as DocumentType } as DocumentoAnalisado, f);
    }
    for (const corpo of c.corposDagua) {
      if (corpo.tipoCorpo === 'SPA') this.addSistemaPorCorpo(c, 'SPA', corpo);
      if (corpo.tipoCorpo === 'PRAINHA') this.addSistemaPorCorpo(c, 'PRAINHA', corpo);
    }
  }

  private addSistemaUnico(c: Consolidacao, sistema: string, doc: DocumentoAnalisado, f: { fonte: string; pagina: number | null }): void {
    if (c.sistemas.some((x) => x.sistema === sistema)) return;
    this.addSistema(c, sistema, doc, f.fonte, f.pagina);
  }

  private addSistemaPorCorpo(c: Consolidacao, sistema: string, corpo: CorpoConsolidado): void {
    if (c.sistemas.some((x) => x.sistema === sistema)) return;
    const f = corpo.areaM2.fontes[0] ?? corpo.profundidadeMaxM.fontes[0];
    if (!f) return;
    c.sistemas.push({ sistema, fontes: [{ documento: f.documento, documentType: f.documentType, fonte: f.fonte, pagina: f.pagina }] });
  }

  private nomeCanonico(tipo: CorpoTipo): string {
    switch (tipo) {
      case 'PISCINA_ADULTO': return 'Piscina Adulto';
      case 'PISCINA_INFANTIL': return 'Piscina Infantil';
      case 'SPA': return 'Spa';
      case 'PRAINHA': return 'Prainha';
      case 'ESPELHO_DAGUA': return "Espelho d'água";
      default: return 'Corpo d\'água';
    }
  }
}
