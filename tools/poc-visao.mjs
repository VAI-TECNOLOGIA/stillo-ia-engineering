#!/usr/bin/env node
/**
 * PoC — Leitura de planta de piscina por VISÃO (GPT-4o) + camada de texto (CAD).
 * Prova que a IA interpreta a planta real e devolve dados estruturados.
 *
 * Uso:  OPENAI_API_KEY=sk-... node tools/poc-visao.mjs ["/caminho/planta.pdf"]
 * (sem argumento, usa a planta do Ex 04 — que tem volumes claros pra conferência)
 */
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('❌ Defina OPENAI_API_KEY no ambiente.'); process.exit(1); }

const EXEMPLOS = '/Users/elisonperini/Desktop/Sistemas/36 - stillo-ia-engineering/projetos-exemplo';
const pdf = process.argv[2] || `${EXEMPLOS}/Ex 04/20008-HID-13-RV00-01-05-2022-PISCINA.pdf`;
console.log('📄 Planta:', pdf);

// 1) Camada de texto (CAD) — números exatos quando existem
let texto = '';
try { texto = execSync(`pdftotext -f 1 -l 3 "${pdf}" -`, { maxBuffer: 20e6 }).toString(); } catch {}
texto = texto.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, 7000);

// 2) Renderiza páginas 1-2 → JPEG (a "visão")
const dir = mkdtempSync(join(tmpdir(), 'poc-visao-'));
execSync(`pdftoppm -jpeg -r 150 -f 1 -l 2 "${pdf}" "${dir}/p"`, { stdio: 'ignore' });
const imgs = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort()
  .map((f) => 'data:image/jpeg;base64,' + readFileSync(join(dir, f)).toString('base64'));
console.log(`🖼️  Imagens: ${imgs.length} · 📝 Texto CAD: ${texto.length} chars\n⏳ Chamando GPT-4o...`);

// 3) Extração estruturada
const sys = `Você é um engenheiro de piscinas especialista. Analise a PLANTA TÉCNICA (imagens) somada ao TEXTO extraído do CAD e devolva SOMENTE um JSON:
{
  "empreendimento": string,
  "piscinas": [{ "nome": string, "comprimento_m": number|null, "largura_m": number|null, "profundidade_m": number|null, "volume_litros": number|null, "sistemas": string[] }],
  "equipamentos_identificados": [{ "descricao": string, "quantidade": number|null, "categoria": string }],
  "perguntas_ao_vendedor": string[],
  "observacoes": string[]
}
Sistemas possíveis: FILTRAGEM, AQUECIMENTO, BORDA_INFINITA, HIDROMASSAGEM, CASCATA, PRAINHA, TRATAMENTO, ILUMINACAO.
Use o TEXTO para números exatos (volumes, perímetros, modelos). NÃO invente dados. Em "perguntas_ao_vendedor", liste o que a IA precisaria confirmar pra fechar o orçamento.`;

const body = {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: sys },
    { role: 'user', content: [
      { type: 'text', text: 'TEXTO EXTRAÍDO DO CAD:\n' + texto + '\n\nAgora analise as imagens da planta e extraia o JSON:' },
      ...imgs.map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
    ] },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.1,
  max_tokens: 2500,
};

const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
  body: JSON.stringify(body),
});
const data = await res.json();
if (!res.ok) { console.error('❌ OpenAI:', JSON.stringify(data).slice(0, 600)); process.exit(1); }
console.log('\n═══════════ EXTRAÇÃO DA IA ═══════════\n');
console.log(data.choices?.[0]?.message?.content);
console.log(`\n💸 tokens: ${data.usage?.total_tokens} (~$${((data.usage?.total_tokens ?? 0) / 1e6 * 5).toFixed(3)})`);
