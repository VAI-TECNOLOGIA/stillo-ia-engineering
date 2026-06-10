import { BadRequestException, Injectable } from '@nestjs/common';
import { OrcamentosService } from './orcamentos.service';

export type FormatoExport = 'txt' | 'csv' | 'doc' | 'html' | 'pdf';

interface ItemView {
  descricao: string;
  quantidade: number;
  precoUnit: number | string;
  subtotal: number | string;
  produto?: { sku: string; nome: string } | null;
}
interface OrcView {
  numero: number;
  valorTotal: number | string;
  obra?: { nome: string; cliente?: { nome: string } | null } | null;
  itens: ItemView[];
}

@Injectable()
export class OrcamentoExportService {
  constructor(private readonly orcamentos: OrcamentosService) {}

  async exportar(tenantId: string, id: string, formato: FormatoExport): Promise<{ filename: string; mimeType: string; conteudo: string }> {
    const orc = (await this.orcamentos.get(tenantId, id)) as unknown as OrcView;
    const base = `orcamento-${orc.numero}`;
    switch (formato) {
      case 'txt':
        return { filename: `${base}.txt`, mimeType: 'text/plain; charset=utf-8', conteudo: this.texto(orc) };
      case 'csv':
        return { filename: `${base}.csv`, mimeType: 'text/csv; charset=utf-8', conteudo: this.csv(orc) };
      case 'doc':
        return { filename: `${base}.doc`, mimeType: 'application/msword', conteudo: this.html(orc) };
      case 'html':
      case 'pdf': // PDF é gerado imprimindo este HTML (print-to-PDF) no front
        return { filename: `${base}.html`, mimeType: 'text/html; charset=utf-8', conteudo: this.html(orc) };
      default:
        throw new BadRequestException('Formato inválido. Use txt | csv | doc | html | pdf.');
    }
  }

  private brl(v: number | string): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  }

  private texto(orc: OrcView): string {
    const linhas = orc.itens.map(
      (i) => `- ${i.descricao}${i.produto ? ` [${i.produto.sku}]` : ''} | ${i.quantidade} x ${this.brl(i.precoUnit)} = ${this.brl(i.subtotal)}`,
    );
    return [
      `ORÇAMENTO Nº ${orc.numero}`,
      `Obra: ${orc.obra?.nome ?? ''}`,
      `Cliente: ${orc.obra?.cliente?.nome ?? ''}`,
      '',
      ...linhas,
      '',
      `TOTAL: ${this.brl(orc.valorTotal)}`,
    ].join('\n');
  }

  private csv(orc: OrcView): string {
    const head = 'SKU;Descricao;Quantidade;PrecoUnit;Subtotal';
    const rows = orc.itens.map((i) => [i.produto?.sku ?? '', `"${i.descricao.replace(/"/g, '""')}"`, i.quantidade, Number(i.precoUnit).toFixed(2), Number(i.subtotal).toFixed(2)].join(';'));
    return [head, ...rows, `;;;TOTAL;${Number(orc.valorTotal).toFixed(2)}`].join('\n');
  }

  private html(orc: OrcView): string {
    const rows = orc.itens
      .map(
        (i) => `<tr>
          <td>${esc(i.descricao)}${i.produto ? `<br><small>SKU ${esc(i.produto.sku)}</small>` : ''}</td>
          <td style="text-align:right">${i.quantidade}</td>
          <td style="text-align:right">${this.brl(i.precoUnit)}</td>
          <td style="text-align:right">${this.brl(i.subtotal)}</td>
        </tr>`,
      )
      .join('');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento ${orc.numero}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:40px;}
  h1{color:#0369a1;margin:0 0 4px;}
  .meta{color:#64748b;margin-bottom:24px;}
  table{width:100%;border-collapse:collapse;font-size:14px;}
  th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left;}
  th{background:#f1f5f9;}
  .total{margin-top:18px;text-align:right;font-size:18px;font-weight:bold;color:#0369a1;}
  @media print{body{margin:12mm;}}
</style></head><body>
  <h1>STILLO — Orçamento Nº ${orc.numero}</h1>
  <div class="meta">Obra: <b>${esc(orc.obra?.nome ?? '')}</b> · Cliente: ${esc(orc.obra?.cliente?.nome ?? '')}</div>
  <table>
    <thead><tr><th>Item</th><th style="text-align:right">Qtd</th><th style="text-align:right">Preço unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total: ${this.brl(orc.valorTotal)}</div>
</body></html>`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
