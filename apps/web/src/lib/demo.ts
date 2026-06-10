/**
 * MODO DEMO — simula a STILLO Piscinas como uma empresa real com ~1 ano de
 * operação: catálogo completo, dezenas de clientes/obras em todas as fases,
 * orçamentos ao longo de 12 meses (aprovados/enviados/recusados), aprendizado
 * com padrões reais e dashboards condizentes. Ativado por VITE_DEMO=true.
 */
import { useAuthStore } from '@/stores/auth.store';

export const isDemo = (): boolean => import.meta.env.VITE_DEMO === 'true';

const PERMS = [
  'clientes:ler', 'clientes:escrever', 'obras:ler', 'obras:escrever', 'leitura:executar',
  'dimensionamento:executar', 'regras:gerir', 'catalogos:gerir', 'produtos:ler', 'produtos:escrever',
  'orcamento:ler', 'orcamento:revisar', 'orcamento:aprovar', 'orcamento:exportar', 'ia:usar',
  'dashboard:operacional', 'dashboard:executivo', 'usuarios:gerir', 'integracoes:gerir',
  'aprendizado:ler', 'aprendizado:gerir', 'auditoria:ler',
];
const USER = { id: 'u1', nome: 'Rafael Stillo', email: 'rafael@stillopiscinas.com.br', role: 'ADMIN', tenantId: 't1', permissions: PERMS };

export function seedDemoAuth(): void {
  const st = useAuthStore.getState();
  if (!st.accessToken) st.setSession({ user: USER, accessToken: 'demo-token', refreshToken: 'demo-refresh' });
}

let seq = 1000;
const uid = (p: string) => `${p}-${++seq}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ─────────────────────────── CLIENTES (12) ──────────────────────────────────
const clientes: any[] = [
  { id: 'c1', nome: 'Família Silva', documento: '623.114.789-00', contatos: [{ tipo: 'telefone', valor: '(98) 99971-1120' }], observacoes: 'Indicação do arquiteto Marcos. Casa de alto padrão.', createdAt: '2025-07-12' },
  { id: 'c2', nome: 'Construtora Aurora Ltda', documento: '12.345.678/0001-90', contatos: [{ tipo: 'telefone', valor: '(48) 3033-2210' }], observacoes: 'Conta corporativa — múltiplas obras/ano.', createdAt: '2025-06-20' },
  { id: 'c3', nome: 'Resort Mar Azul', documento: '98.765.432/0001-10', contatos: [{ tipo: 'whatsapp', valor: '(85) 98888-7777' }], observacoes: 'Piscinas de grande porte + spa.', createdAt: '2025-08-03' },
  { id: 'c4', nome: 'Condomínio Praia Bela', documento: '21.654.987/0001-33', contatos: [{ tipo: 'telefone', valor: '(98) 3245-9090' }], observacoes: 'Síndico Dr. Paulo. Área de lazer comum.', createdAt: '2025-09-15' },
  { id: 'c5', nome: 'Academia BodyTech Ponta Negra', documento: '33.111.222/0001-55', contatos: [{ tipo: 'whatsapp', valor: '(84) 99123-4567' }], observacoes: 'Piscina semi-olímpica aquecida.', createdAt: '2025-10-01' },
  { id: 'c6', nome: 'Hotel Costa Dourada', documento: '44.222.333/0001-66', contatos: [{ tipo: 'telefone', valor: '(85) 3232-1010' }], observacoes: 'Reforma da piscina principal + borda infinita.', createdAt: '2025-11-10' },
  { id: 'c7', nome: 'Família Albuquerque', documento: '511.222.333-44', contatos: [{ tipo: 'whatsapp', valor: '(98) 98800-1234' }], createdAt: '2026-01-18' },
  { id: 'c8', nome: 'Clube Náutico São Luís', documento: '55.333.444/0001-77', contatos: [{ tipo: 'telefone', valor: '(98) 3221-4400' }], observacoes: 'Licitação — exige ART e cronograma.', createdAt: '2026-02-05' },
  { id: 'c9', nome: 'Arq. Marina Reis (parceira)', documento: '688.999.111-22', contatos: [{ tipo: 'whatsapp', valor: '(85) 99777-2211' }], observacoes: 'Arquiteta parceira — traz 2-3 projetos/mês.', createdAt: '2025-06-25' },
  { id: 'c10', nome: 'Spa Bem-Estar', documento: '66.444.555/0001-88', contatos: [{ tipo: 'telefone', valor: '(84) 3611-7788' }], createdAt: '2026-03-22' },
  { id: 'c11', nome: 'Família Mendes', documento: '733.444.555-66', contatos: [{ tipo: 'whatsapp', valor: '(98) 99654-3210' }], createdAt: '2026-04-30' },
  { id: 'c12', nome: 'Construtora Horizonte', documento: '77.555.666/0001-99', contatos: [{ tipo: 'telefone', valor: '(48) 3045-8800' }], observacoes: 'Condomínios de médio padrão em SC.', createdAt: '2026-05-14' },
];

// ─────────────────────────── PRODUTOS (22) ──────────────────────────────────
const produtos: any[] = [
  { id: 'p1', sku: 'LED-1801', nome: 'Refletor LED 18W RGB embutir', categoria: 'LED', fabricante: 'Brustec', modelo: 'RGB-18', unidade: 'un', preco: 89.9, status: 'ATIVO', especificacoes: { potenciaW: 18, tipo: 'embutir', cor: 'RGB' } },
  { id: 'p2', sku: 'LED-0901', nome: 'Refletor LED 9W monocromático', categoria: 'LED', fabricante: 'Brustec', modelo: 'MONO-9', unidade: 'un', preco: 59.9, status: 'ATIVO', especificacoes: { potenciaW: 9 } },
  { id: 'p3', sku: 'LED-CX', nome: 'Caixa de passagem + cabo LED', categoria: 'LED', fabricante: 'Brustec', modelo: 'CX-1', unidade: 'un', preco: 45, status: 'ATIVO', especificacoes: {} },
  { id: 'p4', sku: 'BMB-050', nome: 'Motobomba 1/2cv', categoria: 'FILTRAGEM', fabricante: 'Jacuzzi', modelo: 'A-050', unidade: 'un', preco: 740, status: 'ATIVO', especificacoes: { cv: 0.5, vazaoM3h: 8 } },
  { id: 'p5', sku: 'BMB-075', nome: 'Motobomba 3/4cv', categoria: 'FILTRAGEM', fabricante: 'Jacuzzi', modelo: 'A-075', unidade: 'un', preco: 920, status: 'ATIVO', especificacoes: { cv: 0.75, vazaoM3h: 11 } },
  { id: 'p6', sku: 'BMB-100', nome: 'Motobomba 1cv', categoria: 'FILTRAGEM', fabricante: 'Dancor', modelo: 'PF-100', unidade: 'un', preco: 1180, status: 'ATIVO', especificacoes: { cv: 1, vazaoM3h: 15 } },
  { id: 'p7', sku: 'FLT-500', nome: 'Filtro Ø500 carga de areia', categoria: 'FILTRAGEM', fabricante: 'Sodramar', modelo: 'F500', unidade: 'un', preco: 980, status: 'ATIVO', especificacoes: { diametroMm: 500 } },
  { id: 'p8', sku: 'FLT-600', nome: 'Filtro Ø600 carga de areia', categoria: 'FILTRAGEM', fabricante: 'Sodramar', modelo: 'F600', unidade: 'un', preco: 1340, status: 'ATIVO', especificacoes: { diametroMm: 600 } },
  { id: 'p9', sku: 'TC-40000', nome: 'Trocador de calor 40.000 kcal', categoria: 'AQUECIMENTO', fabricante: 'TholzPro', modelo: 'TC40', unidade: 'un', preco: 4200, status: 'ATIVO', especificacoes: { kcal: 40000 } },
  { id: 'p10', sku: 'TC-60000', nome: 'Trocador de calor 60.000 kcal', categoria: 'AQUECIMENTO', fabricante: 'TholzPro', modelo: 'TC60', unidade: 'un', preco: 5800, status: 'ATIVO', especificacoes: { kcal: 60000 } },
  { id: 'p11', sku: 'BC-12KW', nome: 'Bomba de calor 12kW', categoria: 'AQUECIMENTO', fabricante: 'Nautilus', modelo: 'NHP-12', unidade: 'un', preco: 11200, status: 'ATIVO', especificacoes: { kw: 12 } },
  { id: 'p12', sku: 'BC-09KW', nome: 'Bomba de calor 9kW', categoria: 'AQUECIMENTO', fabricante: 'Nautilus', modelo: 'NHP-9', unidade: 'un', preco: 8900, status: 'DESCONTINUADO', especificacoes: { kw: 9 }, observacoes: 'Substituída pela NHP-12.' },
  { id: 'p13', sku: 'TRAT-KIT', nome: 'Kit de tratamento de água', categoria: 'TRATAMENTO', fabricante: 'HidroAll', modelo: 'KIT-1', unidade: 'kit', preco: 350, status: 'ATIVO', especificacoes: {} },
  { id: 'p14', sku: 'CLOR-SAL', nome: 'Clorador salino 25g/h', categoria: 'TRATAMENTO', fabricante: 'Sodramar', modelo: 'CS-25', unidade: 'un', preco: 2100, status: 'ATIVO', especificacoes: { gramasHora: 25 } },
  { id: 'p15', sku: 'DOSADOR-PH', nome: 'Dosadora automática de pH', categoria: 'TRATAMENTO', fabricante: 'Tholz', modelo: 'DP-1', unidade: 'un', preco: 1450, status: 'ATIVO', especificacoes: {} },
  { id: 'p16', sku: 'HIDRO-6', nome: 'Kit hidromassagem 6 dispositivos', categoria: 'HIDROMASSAGEM', fabricante: 'Albacete', modelo: 'H6', unidade: 'kit', preco: 1890, status: 'ATIVO', especificacoes: { dispositivos: 6 } },
  { id: 'p17', sku: 'BLOWER-15', nome: 'Soprador de ar 1,5cv', categoria: 'HIDROMASSAGEM', fabricante: 'Albacete', modelo: 'BL-15', unidade: 'un', preco: 1250, status: 'ATIVO', especificacoes: { cv: 1.5 } },
  { id: 'p18', sku: 'CASC-60', nome: 'Cascata inox 60cm', categoria: 'CASCATA', fabricante: 'Pooltec', modelo: 'C60', unidade: 'un', preco: 620, status: 'ATIVO', especificacoes: { larguraCm: 60 } },
  { id: 'p19', sku: 'BORDA-CALHA', nome: 'Calha de borda infinita', categoria: 'ESTRUTURA', fabricante: 'Pooltec', modelo: 'BI-1', unidade: 'm', preco: 240, status: 'ATIVO', especificacoes: {} },
  { id: 'p20', sku: 'RESERV-INOX', nome: 'Reservatório inox p/ borda infinita', categoria: 'ESTRUTURA', fabricante: 'Pooltec', modelo: 'RI-3000', unidade: 'un', preco: 3200, status: 'ATIVO', especificacoes: {} },
  { id: 'p21', sku: 'CM-KIT', nome: 'Kit casa de máquinas (tubulação/conexões)', categoria: 'ESTRUTURA', fabricante: 'Tigre', modelo: 'CM-1', unidade: 'kit', preco: 1600, status: 'ATIVO', especificacoes: {} },
  { id: 'p22', sku: 'AUTOM-WIFI', nome: 'Automação WiFi (bomba/luz/aquecimento)', categoria: 'ESTRUTURA', fabricante: 'Tholz', modelo: 'AUT-W', unidade: 'un', preco: 2400, status: 'INATIVO', especificacoes: {}, observacoes: 'Fora de linha no fornecedor.' },
];

// ─────────────────────────── REGRAS (11) ────────────────────────────────────
const regras: any[] = [
  { id: 'r1', nome: 'LED a cada 1,5m de borda', categoria: 'ILUMINACAO', prioridade: 100, ativo: true, versao: 3, quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'LED' }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'LED', descricao: 'Refletor LED de embutir', quantidade: 'teto(piscina.perimetroM / 1.5)' }], createdAt: '2025-06-18' },
  { id: 'r2', nome: 'Iluminação em duas paredes (largura > 6m)', categoria: 'ILUMINACAO', prioridade: 90, ativo: true, versao: 1, quando: { fato: 'piscina.larguraM', op: '>', valor: 6 }, entao: [{ tipo: 'AVISO', mensagem: 'Distribuir iluminação em duas paredes.' }], createdAt: '2025-06-18' },
  { id: 'r3', nome: 'Reforço de LED acima de 100m³', categoria: 'ILUMINACAO', prioridade: 85, ativo: true, versao: 2, quando: { fato: 'piscina.volumeM3', op: '>', valor: 100 }, entao: [{ tipo: 'AVISO', mensagem: 'Volume alto: considerar LED 18W em todas as paredes.' }], createdAt: '2025-09-02' },
  { id: 'r4', nome: 'Filtragem por volume (turnover ~80m³)', categoria: 'FILTRAGEM', prioridade: 80, ativo: true, versao: 4, quando: { fato: 'piscina.volumeM3', op: '>', valor: 0 }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'FILTRAGEM', descricao: 'Conjunto motobomba + filtro', quantidade: 'max(1, teto(piscina.volumeM3 / 80))' }], createdAt: '2025-06-18' },
  { id: 'r5', nome: 'Bomba reforçada acima de 150m³', categoria: 'FILTRAGEM', prioridade: 75, ativo: true, versao: 1, quando: { fato: 'piscina.volumeM3', op: '>', valor: 150 }, entao: [{ tipo: 'EXIGIR_PRODUTO', categoria: 'FILTRAGEM', criterioProduto: { cv: 1 } }], createdAt: '2025-10-11' },
  { id: 'r6', nome: 'Aquecimento quando solicitado', categoria: 'AQUECIMENTO', prioridade: 70, ativo: true, versao: 2, quando: { fato: 'piscina.sistemas', op: 'contem', valor: 'AQUECIMENTO' }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'AQUECIMENTO', descricao: 'Trocador de calor', quantidade: 1 }], createdAt: '2025-06-18' },
  { id: 'r7', nome: 'Bomba de calor na região Sul', categoria: 'AQUECIMENTO', prioridade: 65, ativo: true, versao: 1, quando: { todas: [{ fato: 'piscina.sistemas', op: 'contem', valor: 'AQUECIMENTO' }, { fato: 'obra.regiao', op: '=', valor: 'SUL' }] }, entao: [{ tipo: 'AVISO', mensagem: 'Região fria: recomendar bomba de calor em vez de trocador a gás.' }], createdAt: '2025-12-01' },
  { id: 'r8', nome: 'Tratamento por volume', categoria: 'TRATAMENTO', prioridade: 60, ativo: true, versao: 1, quando: { fato: 'piscina.volumeM3', op: '>', valor: 0 }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'TRATAMENTO', descricao: 'Kit de tratamento de água', quantidade: 1 }], createdAt: '2025-06-18' },
  { id: 'r9', nome: 'Clorador salino acima de 50m³', categoria: 'TRATAMENTO', prioridade: 55, ativo: true, versao: 2, quando: { fato: 'piscina.volumeM3', op: '>', valor: 50 }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'TRATAMENTO', descricao: 'Clorador salino', quantidade: 1 }], createdAt: '2025-08-20' },
  { id: 'r10', nome: 'Mão de obra por complexidade', categoria: 'MAO_DE_OBRA', prioridade: 40, ativo: true, versao: 3, quando: { fato: 'piscina.volumeM3', op: '>', valor: 0 }, entao: [{ tipo: 'ADICIONAR_ITEM', categoria: 'MAO_DE_OBRA', descricao: 'Instalação e comissionamento', quantidade: 1 }], createdAt: '2025-07-05' },
  { id: 'r11', nome: 'Aquecimento solar (Nordeste) — experimental', categoria: 'AQUECIMENTO', prioridade: 30, ativo: false, versao: 1, quando: { fato: 'obra.regiao', op: '=', valor: 'NORDESTE' }, entao: [{ tipo: 'AVISO', mensagem: 'Avaliar aquecimento solar (alta insolação).' }], createdAt: '2026-02-14' },
];

// ─────────────────────────── OBRAS (14) ─────────────────────────────────────
const obras: any[] = [
  { id: 'o1', clienteId: 'c1', nome: 'Residência Silva', cidade: 'São Luís', uf: 'MA', regiao: 'NORDESTE', status: 'EM_ORCAMENTO', cliente: { id: 'c1', nome: 'Família Silva' }, _count: { piscinas: 1, arquivos: 2 }, createdAt: '2026-05-21' },
  { id: 'o2', clienteId: 'c2', nome: 'Condomínio Aurora — Área de lazer', cidade: 'Itapema', uf: 'SC', regiao: 'SUL', status: 'EM_DIMENSIONAMENTO', cliente: { id: 'c2', nome: 'Construtora Aurora' }, _count: { piscinas: 2, arquivos: 3 }, createdAt: '2026-05-28' },
  { id: 'o3', clienteId: 'c3', nome: 'Resort Mar Azul — Piscina principal', cidade: 'Fortaleza', uf: 'CE', regiao: 'NORDESTE', status: 'EM_LEITURA', cliente: { id: 'c3', nome: 'Resort Mar Azul' }, _count: { piscinas: 0, arquivos: 1 }, createdAt: '2026-06-02' },
  { id: 'o4', clienteId: 'c4', nome: 'Condomínio Praia Bela — Lazer', cidade: 'São Luís', uf: 'MA', regiao: 'NORDESTE', status: 'CONCLUIDA', cliente: { id: 'c4', nome: 'Condomínio Praia Bela' }, _count: { piscinas: 2, arquivos: 4 }, createdAt: '2025-09-20' },
  { id: 'o5', clienteId: 'c5', nome: 'BodyTech — Piscina semi-olímpica', cidade: 'Natal', uf: 'RN', regiao: 'NORDESTE', status: 'CONCLUIDA', cliente: { id: 'c5', nome: 'Academia BodyTech' }, _count: { piscinas: 1, arquivos: 5 }, createdAt: '2025-10-08' },
  { id: 'o6', clienteId: 'c6', nome: 'Hotel Costa Dourada — Borda infinita', cidade: 'Fortaleza', uf: 'CE', regiao: 'NORDESTE', status: 'CONCLUIDA', cliente: { id: 'c6', nome: 'Hotel Costa Dourada' }, _count: { piscinas: 1, arquivos: 6 }, createdAt: '2025-11-12' },
  { id: 'o7', clienteId: 'c7', nome: 'Residência Albuquerque', cidade: 'São Luís', uf: 'MA', regiao: 'NORDESTE', status: 'CONCLUIDA', cliente: { id: 'c7', nome: 'Família Albuquerque' }, _count: { piscinas: 1, arquivos: 2 }, createdAt: '2026-01-20' },
  { id: 'o8', clienteId: 'c8', nome: 'Clube Náutico — Reforma (licitação)', cidade: 'São Luís', uf: 'MA', regiao: 'NORDESTE', status: 'EM_ORCAMENTO', cliente: { id: 'c8', nome: 'Clube Náutico São Luís' }, _count: { piscinas: 2, arquivos: 3 }, createdAt: '2026-02-10' },
  { id: 'o9', clienteId: 'c9', nome: 'Projeto Reis — Casa de praia', cidade: 'Aquiraz', uf: 'CE', regiao: 'NORDESTE', status: 'CONCLUIDA', cliente: { id: 'c9', nome: 'Arq. Marina Reis' }, _count: { piscinas: 1, arquivos: 3 }, createdAt: '2026-03-01' },
  { id: 'o10', clienteId: 'c10', nome: 'Spa Bem-Estar — Hidro + sauna', cidade: 'Natal', uf: 'RN', regiao: 'NORDESTE', status: 'ARQUIVADA', cliente: { id: 'c10', nome: 'Spa Bem-Estar' }, _count: { piscinas: 1, arquivos: 2 }, createdAt: '2026-03-25' },
  { id: 'o11', clienteId: 'c11', nome: 'Residência Mendes', cidade: 'São José de Ribamar', uf: 'MA', regiao: 'NORDESTE', status: 'EM_ORCAMENTO', cliente: { id: 'c11', nome: 'Família Mendes' }, _count: { piscinas: 1, arquivos: 1 }, createdAt: '2026-05-02' },
  { id: 'o12', clienteId: 'c12', nome: 'Cond. Horizonte Fase 1', cidade: 'Balneário Camboriú', uf: 'SC', regiao: 'SUL', status: 'EM_DIMENSIONAMENTO', cliente: { id: 'c12', nome: 'Construtora Horizonte' }, _count: { piscinas: 3, arquivos: 2 }, createdAt: '2026-05-16' },
  { id: 'o13', clienteId: 'c2', nome: 'Condomínio Aurora — Torre B', cidade: 'Itapema', uf: 'SC', regiao: 'SUL', status: 'CONCLUIDA', cliente: { id: 'c2', nome: 'Construtora Aurora' }, _count: { piscinas: 1, arquivos: 4 }, createdAt: '2025-12-15' },
  { id: 'o14', clienteId: 'c9', nome: 'Projeto Reis — Cobertura', cidade: 'Fortaleza', uf: 'CE', regiao: 'NORDESTE', status: 'RASCUNHO', cliente: { id: 'c9', nome: 'Arq. Marina Reis' }, _count: { piscinas: 0, arquivos: 0 }, createdAt: '2026-06-05' },
];

const piscinasPorObra: Record<string, any[]> = {
  o1: [{ id: 'pi1', nome: 'Piscina principal', tipo: 'EXTERNA', comprimentoM: 10, larguraM: 6, profundidadeM: 1.4, volumeM3: 84, origemLeitura: true, confiancaLeitura: 0.92, sistemas: ['BORDA_INFINITA', 'AQUECIMENTO', 'LED', 'TRATAMENTO'] }],
  o2: [
    { id: 'pi2', nome: 'Piscina adulto', tipo: 'EXTERNA', comprimentoM: 12, larguraM: 6, profundidadeM: 1.6, volumeM3: 115.2, origemLeitura: true, confiancaLeitura: 0.9 },
    { id: 'pi3', nome: 'Piscina infantil', tipo: 'EXTERNA', comprimentoM: 4, larguraM: 3, profundidadeM: 0.6, volumeM3: 7.2, origemLeitura: true, confiancaLeitura: 0.8 },
  ],
  o8: [
    { id: 'pi4', nome: 'Piscina semi-olímpica', tipo: 'EXTERNA', comprimentoM: 25, larguraM: 12.5, profundidadeM: 1.8, volumeM3: 562.5, origemLeitura: false },
    { id: 'pi5', nome: 'Piscina de treino', tipo: 'EXTERNA', comprimentoM: 16, larguraM: 8, profundidadeM: 1.5, volumeM3: 192, origemLeitura: false },
  ],
  o12: [
    { id: 'pi6', nome: 'Lazer adulto', tipo: 'EXTERNA', comprimentoM: 10, larguraM: 5, profundidadeM: 1.4, volumeM3: 70, origemLeitura: true, confiancaLeitura: 0.88 },
    { id: 'pi7', nome: 'Raia', tipo: 'EXTERNA', comprimentoM: 14, larguraM: 4, profundidadeM: 1.5, volumeM3: 84, origemLeitura: true, confiancaLeitura: 0.84 },
    { id: 'pi8', nome: 'Spa aquecido', tipo: 'EXTERNA', comprimentoM: 3, larguraM: 3, profundidadeM: 1, volumeM3: 9, origemLeitura: true, confiancaLeitura: 0.7 },
  ],
  o11: [{ id: 'pi9', nome: 'Piscina', tipo: 'EXTERNA', comprimentoM: 7, larguraM: 3.5, profundidadeM: 1.4, volumeM3: 34.3, origemLeitura: true, confiancaLeitura: 0.82 }],
};

// ─────────────────────────── CATÁLOGOS (5) ──────────────────────────────────
const catalogos: any[] = [
  { id: 'cat1', nome: 'Catálogo Brustec Iluminação 2026.pdf', fonte: 'PDF', statusIndexacao: 'INDEXADO', totalChunks: 142, createdAt: '2025-07-01' },
  { id: 'cat2', nome: 'Tabela Jacuzzi bombas.csv', fonte: 'CSV', statusIndexacao: 'INDEXADO', totalChunks: 38, createdAt: '2025-07-03' },
  { id: 'cat3', nome: 'Sodramar filtros e cloradores.pdf', fonte: 'PDF', statusIndexacao: 'INDEXADO', totalChunks: 96, createdAt: '2025-09-10' },
  { id: 'cat4', nome: 'TholzPro aquecimento 2026.pdf', fonte: 'PDF', statusIndexacao: 'INDEXANDO', totalChunks: 0, createdAt: '2026-06-05' },
  { id: 'cat5', nome: 'lista-precos-pooltec.xlsx', fonte: 'EXCEL', statusIndexacao: 'FALHA', totalChunks: 0, erro: 'Formato EXCEL ainda não suportado na indexação (use PDF/CSV).', createdAt: '2026-05-30' },
];

// ─────────────────────────── ORÇAMENTOS ─────────────────────────────────────
type Item = { id: string; descricao: string; quantidade: number; precoUnit: number; subtotal: number; origem: string; produto?: any };
const it = (id: string, descricao: string, quantidade: number, precoUnit: number, origem: string, sku?: string, nome?: string): Item =>
  ({ id, descricao, quantidade, precoUnit, subtotal: round2(quantidade * precoUnit), origem, produto: sku ? { id: 'p', sku, nome: nome ?? sku } : null } as any);
function mkOrc(o: { id: string; numero: number; status: string; versaoAtual: number; obra: any; createdAt: string; itens: Item[] }): any {
  return { ...o, valorTotal: round2(o.itens.reduce((s, i) => s + i.subtotal, 0)) };
}
// Templates disponíveis pelo fluxo (não aparecem na lista inicial)
const orcTemplates: Record<string, any> = {
  orc1042: mkOrc({ id: 'orc1042', numero: 1042, status: 'EM_REVISAO', versaoAtual: 1, createdAt: '2026-06-08', obra: { id: 'o1', nome: 'Residência Silva — Borda infinita', cliente: { nome: 'Família Silva' } }, itens: [
    it('q1', 'Filtro Syllent Syl 750', 1, 3890, 'IA_RAG', 'SYL-750', 'Filtro Syllent Syl 750'),
    it('q2', 'Motobomba 1,5cv com pré-filtro Syllent Silenciosa', 1, 2450, 'IA_RAG', 'MB-150S', 'Motobomba 1,5cv Syllent'),
    it('q3', 'Areia 25kg', 10, 85, 'IA_RAG', 'AREIA-25', 'Areia filtrante 25kg'),
    it('q4', 'Dispositivos de aspiração em aço inox 316', 1, 320, 'REGRA'),
    it('q5', 'Tampa fechamento automático aspirador', 1, 240, 'REGRA'),
    it('q6', 'Dispositivos de retorno quente e frio em aço inox 316', 18, 95, 'REGRA'),
    it('q7', 'Ralo de fundo com dreno anti-hair Tampa ABS 15x15cm', 6, 180, 'REGRA'),
    it('q8', 'Kit aspiração e limpeza', 1, 520, 'REGRA'),
    it('q9', 'Hiper led em aço inox RGB para piscina e prainha', 7, 420, 'REGRA'),
    it('q10', 'Hiper led em aço inox RGB para calha da borda infinita', 5, 420, 'REGRA'),
    it('q11', 'Caixa de comando 10A com saídas auxiliares e fonte 12v BLINDADA', 1, 1280, 'IA_RAG', 'CX-10A', 'Caixa de comando 10A'),
    it('q12', 'Kit Prensa Cabo c/Adaptador 25mm', 12, 38, 'REGRA'),
    it('q13', 'Dispositivos de retorno quente e frio inox 316 (borda)', 6, 95, 'REGRA'),
    it('q14', 'Ralo de fundo com dreno anti-hair Tampa ABS 15x15cm (borda)', 2, 180, 'REGRA'),
    it('q15', 'Válvulas de retenção importada com visor para borda infinita', 1, 690, 'IA_RAG', 'VR-BI', 'Válvula de retenção BI'),
    it('q16', 'Dispositivos de nível em aço inox 316', 1, 280, 'REGRA'),
    it('q17', 'Motobomba 1,5cv pré-filtro Syllent Silenciosa Overflow', 1, 2450, 'REGRA'),
    it('q18', 'Gerador de cloro a base de sal digital wifi', 1, 4900, 'IA_RAG', 'GC-SAL-W', 'Gerador de cloro salino wifi'),
    it('q19', 'Sacos de sal 25kg especial piscina', 15, 65, 'IA_RAG', 'SAL-25', 'Sal especial 25kg'),
    it('q20', 'Trocador de calor Inverter Fti-125 Fromtherm', 2, 9800, 'IA_RAG', 'FTI-125', 'Trocador Inverter Fti-125'),
    it('q21', 'Motobomba 2cv com pré-filtro Syllent', 1, 3100, 'IA_RAG', 'MB-200S', 'Motobomba 2cv Syllent'),
    it('q22', 'Mão de obra hidráulica e elétrica e acompanhamento total', 1, 12000, 'REGRA'),
    it('q23', 'M.O montagem quadro elétrico completo', 1, 2800, 'REGRA'),
  ] }),
  orc1041: mkOrc({ id: 'orc1041', numero: 1041, status: 'ENVIADO', versaoAtual: 2, createdAt: '2026-05-29', obra: { id: 'o11', nome: 'Residência Mendes', cliente: { nome: 'Família Mendes' } }, itens: [
    it('a1', 'Refletor LED de embutir', 11, 89.9, 'REGRA', 'LED-1801', 'LED 18W'),
    it('a2', 'Motobomba 1/2cv', 1, 740, 'IA_RAG', 'BMB-050', 'Motobomba 1/2cv'),
    it('a3', 'Kit de tratamento de água', 1, 350, 'REGRA'),
    it('a4', 'Instalação e comissionamento', 1, 2400, 'REGRA'),
  ] }),
  orc1038: mkOrc({ id: 'orc1038', numero: 1038, status: 'APROVADO', versaoAtual: 4, createdAt: '2026-05-12', obra: { id: 'o8', nome: 'Clube Náutico — Reforma', cliente: { nome: 'Clube Náutico São Luís' } }, itens: [
    it('b1', 'Refletor LED de embutir', 48, 89.9, 'REGRA', 'LED-1801', 'LED 18W'),
    it('b2', 'Motobomba 1cv', 4, 1180, 'REGRA', 'BMB-100', 'Motobomba 1cv'),
    it('b3', 'Filtro Ø600', 4, 1340, 'IA_RAG', 'FLT-600', 'Filtro Ø600'),
    it('b4', 'Clorador salino', 2, 2100, 'REGRA', 'CLOR-SAL', 'Clorador salino'),
    it('b5', 'Bomba de calor 12kW', 2, 11200, 'MANUAL', 'BC-12KW', 'Bomba de calor 12kW'),
    it('b6', 'Instalação e comissionamento', 1, 28000, 'REGRA'),
  ] }),
  orc1030: mkOrc({ id: 'orc1030', numero: 1030, status: 'APROVADO', versaoAtual: 2, createdAt: '2026-03-04', obra: { id: 'o9', nome: 'Projeto Reis — Casa de praia', cliente: { nome: 'Arq. Marina Reis' } }, itens: [
    it('c1', 'Refletor LED de embutir', 14, 89.9, 'REGRA', 'LED-1801', 'LED 18W'),
    it('c2', 'Cascata inox 60cm', 2, 620, 'MANUAL', 'CASC-60', 'Cascata 60cm'),
    it('c3', 'Conjunto motobomba + filtro', 1, 980, 'IA_RAG', 'FLT-500', 'Filtro Ø500'),
    it('c4', 'Trocador de calor 40.000 kcal', 1, 4200, 'REGRA', 'TC-40000', 'Trocador 40.000'),
    it('c5', 'Instalação e comissionamento', 1, 6500, 'REGRA'),
  ] }),
  orc1025: mkOrc({ id: 'orc1025', numero: 1025, status: 'RECUSADO', versaoAtual: 1, createdAt: '2026-02-18', obra: { id: 'o10', nome: 'Spa Bem-Estar — Hidro', cliente: { nome: 'Spa Bem-Estar' } }, itens: [
    it('d1', 'Kit hidromassagem 6 dispositivos', 1, 1890, 'MANUAL', 'HIDRO-6', 'Kit hidro'),
    it('d2', 'Soprador de ar 1,5cv', 1, 1250, 'IA_RAG', 'BLOWER-15', 'Soprador'),
    it('d3', 'Instalação e comissionamento', 1, 4200, 'REGRA'),
  ] }),
  orc1018: mkOrc({ id: 'orc1018', numero: 1018, status: 'APROVADO', versaoAtual: 3, createdAt: '2025-12-20', obra: { id: 'o13', nome: 'Cond. Aurora — Torre B', cliente: { nome: 'Construtora Aurora' } }, itens: [
    it('e1', 'Refletor LED de embutir', 20, 89.9, 'REGRA', 'LED-1801', 'LED 18W'),
    it('e2', 'Motobomba 3/4cv', 2, 920, 'REGRA', 'BMB-075', 'Motobomba 3/4cv'),
    it('e3', 'Filtro Ø600', 2, 1340, 'IA_RAG', 'FLT-600', 'Filtro Ø600'),
    it('e4', 'Bomba de calor 12kW', 1, 11200, 'REGRA', 'BC-12KW', 'Bomba de calor 12kW'),
    it('e5', 'Instalação e comissionamento', 1, 14500, 'REGRA'),
  ] }),
};

// Lista ativa — começa vazia para testes limpos.
// Orçamentos gerados pelo fluxo IA são adicionados aqui dinamicamente.
const orcamentosById: Record<string, any> = {};

function listaOrcamentos(): any[] {
  return Object.values(orcamentosById)
    .map((o: any) => ({ id: o.id, numero: o.numero, status: o.status, valorTotal: o.valorTotal, createdAt: o.createdAt, obra: o.obra }))
    .sort((a, b) => b.numero - a.numero);
}
function getOrcamento(id: string): any {
  // Se já foi gerado nessa sessão, retorna o vivo
  if (orcamentosById[id]) return orcamentosById[id];
  // Primeira vez que acessa: carrega do template e registra na lista
  if (orcTemplates[id]) {
    orcamentosById[id] = orcTemplates[id];
    return orcTemplates[id];
  }
  // Fallback
  orcamentosById['orc1042'] = orcTemplates['orc1042'];
  return orcTemplates['orc1042'];
}

// ─────────────────────────── LEITURA / DIMENSIONAMENTO ───────────────────────
function leituraDe(obraId: string): any {
  if (obraId === 'o3') {
    return { id: 'leit-o3', obraId, status: 'REVISAO_MANUAL', ocrConfianca: 0.42, modeloIa: 'gpt-4o',
      resultado: { piscinas: [{ nome: 'Piscina principal', tipo: 'EXTERNA', comprimentoM: 18, larguraM: 8, profundidadeM: null, sistemas: ['LED', 'BORDA_INFINITA', 'AQUECIMENTO'], confianca: 0.45 }], avisos: ['PDF escaneado de baixa qualidade — profundidade não identificada. Revise manualmente.'] } };
  }
  if (obraId === 'o1') {
    return { id: 'leit-o1', obraId, status: 'REVISAO_MANUAL', ocrConfianca: 0.92, modeloIa: 'gpt-4o',
      resultado: { piscinas: [{ nome: 'Piscina principal', tipo: 'EXTERNA', comprimentoM: 10, larguraM: 6, profundidadeM: 1.4, sistemas: ['BORDA_INFINITA', 'AQUECIMENTO', 'LED', 'TRATAMENTO'], confianca: 0.92 }], avisos: ['Borda infinita identificada na planta — calha e reservatório de overflow previstos.'] } };
  }
  return { id: 'leit-' + obraId, obraId, status: 'REVISAO_MANUAL', ocrConfianca: 0.86, modeloIa: 'gpt-4o',
    resultado: { piscinas: [
      { nome: 'Piscina principal', tipo: 'EXTERNA', comprimentoM: 8, larguraM: 4, profundidadeM: 1.5, sistemas: ['LED', 'AQUECIMENTO'], confianca: 0.86 },
      { nome: 'Spa', tipo: 'EXTERNA', comprimentoM: 2.5, larguraM: 2.5, profundidadeM: 1, sistemas: ['HIDROMASSAGEM'], confianca: 0.55 },
    ], avisos: ['Profundidade do spa estimada — confira.'] } };
}
function dimensionamentoDe(obraId: string): any {
  const CAT = 'Catálogo técnico', REG = 'Regra pré-definida', REGCAT = 'Regra + catálogo';
  const di = (id: string, categoria: string, descricao: string, quantidade: number, unidade: string, precoUnit: number, definicao: string, sku?: string, nome?: string) => ({
    id, categoria, descricao, quantidade, unidade, precoUnit, definicao,
    produtoSugerido: sku ? { id: 'p-' + sku, sku, nome: nome ?? sku, preco: precoUnit } : null,
    regra: definicao.toLowerCase().includes('regra') ? { id: 'r', nome: 'regra pré-definida' } : null,
  });
  const itens = [
    // Sistema de filtragem
    di('f1', 'Sistema de filtragem', 'Filtro Syllent Syl 750', 1, 'un', 3890, CAT, 'SYL-750', 'Filtro Syllent Syl 750'),
    di('f2', 'Sistema de filtragem', 'Motobomba 1,5cv com pré-filtro Syllent Silenciosa', 1, 'un', 2450, CAT, 'MB-150S', 'Motobomba 1,5cv Syllent'),
    di('f3', 'Sistema de filtragem', 'Areia 25kg', 10, 'sc', 85, CAT, 'AREIA-25', 'Areia filtrante 25kg'),
    di('f4', 'Sistema de filtragem', 'Dispositivos de aspiração em aço inox 316', 1, 'un', 320, REG),
    di('f5', 'Sistema de filtragem', 'Tampa fechamento automático aspirador', 1, 'un', 240, REG),
    di('f6', 'Sistema de filtragem', 'Dispositivos de retorno quente e frio em aço inox 316', 18, 'un', 95, REG),
    di('f7', 'Sistema de filtragem', 'Ralo de fundo com dreno anti-hair Tampa ABS 15x15cm', 6, 'un', 180, REG),
    di('f8', 'Sistema de filtragem', 'Kit aspiração e limpeza', 1, 'kit', 520, REG),
    // Iluminação
    di('l1', 'Iluminação', 'Hiper led em aço inox RGB para piscina e prainha', 7, 'un', 420, REG),
    di('l2', 'Iluminação', 'Hiper led em aço inox RGB para calha da borda infinita', 5, 'un', 420, REG),
    di('l3', 'Iluminação', 'Caixa de comando 10A com saídas auxiliares e fonte 12v BLINDADA', 1, 'un', 1280, CAT, 'CX-10A', 'Caixa de comando 10A'),
    di('l4', 'Iluminação', 'Kit Prensa Cabo c/Adaptador 25mm', 12, 'un', 38, REG),
    // Borda Infinita
    di('b1', 'Borda Infinita', 'Dispositivos de retorno quente e frio em aço inox 316', 6, 'un', 95, REGCAT),
    di('b2', 'Borda Infinita', 'Ralo de fundo com dreno anti-hair Tampa ABS 15x15cm', 2, 'un', 180, REG),
    di('b3', 'Borda Infinita', 'Válvulas de retenção importada com visor para borda infinita', 1, 'un', 690, CAT, 'VR-BI', 'Válvula de retenção borda infinita'),
    di('b4', 'Borda Infinita', 'Dispositivos de nível em aço inox 316', 1, 'un', 280, REG),
    di('b5', 'Borda Infinita', 'Motobomba 1,5cv com pré-filtro Syllent Silenciosa (Overflow)', 1, 'un', 2450, REG),
    // Tratamento da água
    di('t1', 'Tratamento da água', 'Gerador de cloro a base de sal digital wifi', 1, 'un', 4900, CAT, 'GC-SAL-W', 'Gerador de cloro salino wifi'),
    di('t2', 'Tratamento da água', 'Sacos de sal 25kg especial piscina', 15, 'sc', 65, CAT, 'SAL-25', 'Sal especial 25kg'),
    // Aquecimento o ano todo
    di('a1', 'Aquecimento o ano todo', 'Trocador de calor Inverter Fti-125 Fromtherm', 2, 'un', 9800, CAT, 'FTI-125', 'Trocador Inverter Fti-125'),
    di('a2', 'Aquecimento o ano todo', 'Motobomba 2cv com pré-filtro Syllent', 1, 'un', 3100, CAT, 'MB-200S', 'Motobomba 2cv Syllent'),
    // Mão de obra
    di('m1', 'Mão de Obra', 'Mão de obra hidráulica e elétrica e acompanhamento total', 1, 'serv', 12000, REG),
    di('m2', 'Mão de Obra', 'M.O montagem quadro elétrico completo', 1, 'serv', 2800, REG),
  ];
  return { id: 'dim-' + obraId, obraId, status: 'CONCLUIDO', resumo: { totalItens: itens.length, avisos: ['Largura 6,00m: iluminação distribuída nas duas paredes (regra r2).', 'Borda infinita: reservatório de overflow + bomba dedicada dimensionados.', 'Aquecimento o ano todo: 2 trocadores Inverter para os 84.000 L.'] }, itens };
}

const page = (items: any[]) => ({ items, nextCursor: null });
const match = (path: string, re: RegExp) => re.exec(path.split('?')[0]);

// Leitura e Dimensionamento: simulam "processando" → "concluído" ao clicar (por obra).
const PROCESSANDO_MS = 2200;
const leituraSessao: Record<string, number> = {};
const leituraProcessando = (obraId: string) => ({ id: 'leit-' + obraId, obraId, status: 'PROCESSANDO', ocrConfianca: null, modeloIa: 'gpt-4o', resultado: { piscinas: [], avisos: [] } });
const dimSessao: Record<string, number> = {};
const dimProcessando = (obraId: string) => ({ id: 'dim-' + obraId, obraId, status: 'PROCESSANDO', resumo: { avisos: [] }, itens: [] });

export async function demoHandle<T>(path: string, method: string, body?: unknown): Promise<T> {
  // Latência realista p/ operações de IA (parecer que está "pensando").
  const extra = path === '/ia/chat' ? 1200 : path.endsWith('/base-conhecimento/gerar') ? 1500 : (/\/orcamentos$/.test(path) && method === 'POST') ? 800 : 0;
  await new Promise((r) => setTimeout(r, 160 + extra));
  const b: any = body ?? {};
  const q = (k: string) => new URLSearchParams(path.split('?')[1] ?? '').get(k) ?? '';
  let m: RegExpExecArray | null;

  if (path === '/auth/login') return { accessToken: 'demo-token', refreshToken: 'demo-refresh', user: USER } as T;
  if (path === '/auth/me') return { ...USER } as T;
  if (path === '/auth/refresh') return { accessToken: 'demo-token', refreshToken: 'demo-refresh' } as T;

  // Clientes
  if (path.startsWith('/clientes') && method === 'GET' && !match(path, /^\/clientes\/[^/]+$/)) { const t = q('q').toLowerCase(); return page(clientes.filter((c) => !t || c.nome.toLowerCase().includes(t))) as T; }
  if (path === '/clientes' && method === 'POST') { const c = { id: uid('c'), createdAt: 'agora', contatos: [], ...b }; clientes.unshift(c); return c as T; }
  if ((m = match(path, /^\/clientes\/([^/]+)$/)) && method === 'PATCH') { const c = clientes.find((x) => x.id === m![1]); Object.assign(c, b); return c as T; }
  if ((m = match(path, /^\/clientes\/([^/]+)$/)) && method === 'DELETE') { const i = clientes.findIndex((x) => x.id === m![1]); if (i >= 0) clientes.splice(i, 1); return { id: m![1] } as T; }

  // Produtos
  if (path.startsWith('/produtos/buscar')) { const t = q('q').toLowerCase(); return produtos.filter((p) => p.status === 'ATIVO' && (!t || p.nome.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t))).slice(0, 8) as T; }
  if (path.startsWith('/produtos') && method === 'GET' && !match(path, /^\/produtos\/[^/]+$/)) { const t = q('q').toLowerCase(); return page(produtos.filter((p) => !t || p.nome.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t) || (p.fabricante ?? '').toLowerCase().includes(t))) as T; }
  if (path === '/produtos' && method === 'POST') { const p = { id: uid('p'), status: 'ATIVO', unidade: 'un', especificacoes: {}, ...b }; produtos.unshift(p); return p as T; }
  if ((m = match(path, /^\/produtos\/([^/]+)$/)) && method === 'PATCH') { const p = produtos.find((x) => x.id === m![1]); Object.assign(p, b); return p as T; }
  if ((m = match(path, /^\/produtos\/([^/]+)$/)) && method === 'DELETE') { const i = produtos.findIndex((x) => x.id === m![1]); if (i >= 0) produtos.splice(i, 1); return { id: m![1] } as T; }

  // Regras
  if (path === '/regras' && method === 'GET') return [...regras].sort((a, b2) => b2.prioridade - a.prioridade) as T;
  if (path === '/regras' && method === 'POST') { const r = { id: uid('r'), versao: 1, createdAt: 'agora', ...b }; regras.unshift(r); return r as T; }
  if (path === '/regras/simular' && method === 'POST') return { itens: [{ categoria: 'LED', descricao: 'Refletor LED de embutir', quantidade: 16, unidade: 'un' }], avisos: ['Largura > 6m: distribuir a iluminação em duas paredes.'], regrasDisparadas: ['preview'] } as T;
  if ((m = match(path, /^\/regras\/([^/]+)$/)) && method === 'PATCH') { const r = regras.find((x) => x.id === m![1]); Object.assign(r, b, { versao: (r.versao ?? 1) + 1 }); return r as T; }
  if ((m = match(path, /^\/regras\/([^/]+)$/)) && method === 'DELETE') { const i = regras.findIndex((x) => x.id === m![1]); if (i >= 0) regras.splice(i, 1); return { id: m![1] } as T; }

  // Obras
  if (path.startsWith('/obras') && method === 'GET' && !path.includes('/leitura') && !path.includes('/dimensionamento') && !path.includes('/arquivos') && !match(path, /^\/obras\/[^/]+$/)) { const t = q('q').toLowerCase(); return page(obras.filter((o) => !t || o.nome.toLowerCase().includes(t))) as T; }
  if (path === '/obras' && method === 'POST') { const o = { id: uid('o'), status: 'RASCUNHO', cliente: clientes.find((c) => c.id === b.clienteId), _count: { piscinas: 0, arquivos: 0 }, ...b }; obras.unshift(o); piscinasPorObra[o.id] = []; return o as T; }
  if ((m = match(path, /^\/obras\/([^/]+)$/)) && method === 'GET') { const o = obras.find((x) => x.id === m![1]); return { ...o, piscinas: piscinasPorObra[m![1]] ?? [] } as T; }
  if ((m = match(path, /^\/obras\/([^/]+)\/arquivos$/)) && method === 'GET') return [{ id: 'a1', nomeOriginal: 'projeto-arquitetonico.pdf', tipo: 'PDF', statusProcessamento: 'CONCLUIDO', createdAt: '—' }, { id: 'a2', nomeOriginal: 'planta-baixa.jpg', tipo: 'IMAGEM', statusProcessamento: 'CONCLUIDO', createdAt: '—' }] as T;
  if ((m = match(path, /^\/obras\/([^/]+)\/leitura$/)) && method === 'POST') { leituraSessao[m[1]] = Date.now(); return leituraProcessando(m[1]) as T; }
  if ((m = match(path, /^\/obras\/([^/]+)\/leitura$/)) && method === 'GET') {
    const t0 = leituraSessao[m[1]];
    if (!t0) return null as T;                                     // ainda não lida → mostra upload + botão
    if (Date.now() - t0 < PROCESSANDO_MS) return leituraProcessando(m[1]) as T; // "processando OCR + IA"
    return leituraDe(m[1]) as T;                                   // concluído: piscinas extraídas + confiança
  }
  if ((m = match(path, /^\/obras\/([^/]+)\/dimensionamento$/)) && method === 'POST') { dimSessao[m[1]] = Date.now(); return dimProcessando(m[1]) as T; }
  if ((m = match(path, /^\/obras\/([^/]+)\/dimensionamento$/)) && method === 'GET') {
    const t0 = dimSessao[m[1]];
    if (!t0) return null as T;                                         // ainda não gerado → mostra piscinas + botão
    if (Date.now() - t0 < PROCESSANDO_MS) return dimProcessando(m[1]) as T; // "rodando o motor"
    return dimensionamentoDe(m[1]) as T;                              // concluído: necessidades + SKU sugerido
  }
  if ((m = match(path, /^\/obras\/([^/]+)\/orcamentos$/)) && method === 'POST') return orcamentosById.orc1042 as T;
  if ((m = match(path, /^\/leituras\/([^/]+)\/aplicar$/))) return { piscinasCriadas: 2 } as T;
  if ((m = match(path, /^\/leituras\/([^/]+)$/)) && method === 'PATCH') return { id: m![1], status: 'CONCLUIDO' } as T;

  // Catálogos
  if (path === '/catalogos' && method === 'GET') return catalogos as T;
  if ((m = match(path, /^\/catalogos\/([^/]+)\/reindexar$/))) return { status: 'INDEXANDO' } as T;

  // Orçamentos
  if (path === '/orcamentos' && method === 'GET') return listaOrcamentos() as T;
  if ((m = match(path, /^\/orcamentos\/([^/]+)$/)) && method === 'GET') return getOrcamento(m[1]) as T;
  if ((m = match(path, /^\/orcamentos\/([^/]+)\/itens\/([^/]+)$/)) && method === 'PATCH') { const o = getOrcamento(m[1]); const i = o.itens.find((x: any) => x.id === m![2]); if (i) { Object.assign(i, b); i.subtotal = round2((b.quantidade ?? i.quantidade) * (b.precoUnit ?? i.precoUnit)); } o.valorTotal = round2(o.itens.reduce((s: number, x: any) => s + Number(x.subtotal), 0)); o.status = 'EM_REVISAO'; return o as T; }
  if ((m = match(path, /^\/orcamentos\/([^/]+)\/itens$/)) && method === 'POST') { const o = getOrcamento(m[1]); o.itens.push({ id: uid('it'), origem: 'MANUAL', produto: null, ...b, subtotal: round2((b.quantidade ?? 1) * (b.precoUnit ?? 0)) }); o.valorTotal = round2(o.itens.reduce((s: number, x: any) => s + Number(x.subtotal), 0)); o.status = 'EM_REVISAO'; return o as T; }
  if ((m = match(path, /^\/orcamentos\/([^/]+)\/itens\/([^/]+)$/)) && method === 'DELETE') { const o = getOrcamento(m[1]); o.itens = o.itens.filter((x: any) => x.id !== m![2]); o.valorTotal = round2(o.itens.reduce((s: number, x: any) => s + Number(x.subtotal), 0)); return o as T; }
  if ((m = match(path, /^\/orcamentos\/([^/]+)\/aprovar$/))) { const o = getOrcamento(m[1]); o.status = 'APROVADO'; return o as T; }
  if ((m = match(path, /^\/orcamentos\/([^/]+)\/versoes$/)) && method === 'POST') { const o = getOrcamento(m[1]); o.versaoAtual++; return { versao: o.versaoAtual } as T; }

  // IA chat (resposta varia por palavra-chave)
  if (path === '/ia/chat' && method === 'POST') {
    const msg = String(b.mensagem ?? '').toLowerCase();
    let resposta = 'Com base no catálogo, recomendo a Motobomba 1/2cv (BMB-050) e o Filtro Ø500 (FLT-500) para piscinas até ~80m³.';
    let fontes = [{ produtoId: 'p4', sku: 'BMB-050', nome: 'Motobomba 1/2cv' }, { produtoId: 'p7', sku: 'FLT-500', nome: 'Filtro Ø500' }];
    if (/aquec|calor|fria|temperatura/.test(msg)) { resposta = 'Para aquecimento, o Trocador de calor 40.000 kcal (TC-40000) atende piscinas residenciais. Em regiões frias (Sul), prefira a Bomba de calor 12kW (BC-12KW).'; fontes = [{ produtoId: 'p9', sku: 'TC-40000', nome: 'Trocador 40.000 kcal' }, { produtoId: 'p11', sku: 'BC-12KW', nome: 'Bomba de calor 12kW' }]; }
    else if (/led|ilumin|luz/.test(msg)) { resposta = 'Para iluminação, use o Refletor LED 18W RGB (LED-1801), 1 a cada 1,5m de borda. Acima de 100m³, distribua em duas paredes.'; fontes = [{ produtoId: 'p1', sku: 'LED-1801', nome: 'LED 18W RGB' }]; }
    else if (/cloro|salin|tratam|água|agua/.test(msg)) { resposta = 'Acima de 50m³ recomendo o Clorador salino 25g/h (CLOR-SAL); abaixo disso, o Kit de tratamento (TRAT-KIT) resolve.'; fontes = [{ produtoId: 'p14', sku: 'CLOR-SAL', nome: 'Clorador salino' }, { produtoId: 'p13', sku: 'TRAT-KIT', nome: 'Kit tratamento' }]; }
    return { conversaId: 'cv1', resposta, fontes } as T;
  }

  // Configurações — empresa com OpenAI já vinculada
  if (path === '/config/integracoes' && method === 'GET') return { openai: { vinculado: true, origem: 'tenant', modelo: 'gpt-4o', chaveMascarada: 'sk-••••a1B2', vinculadoEm: '2025-06-19T14:00:00Z' } } as T;
  if (path === '/config/integracoes/openai' && method === 'PUT') return { openai: { vinculado: true, origem: 'tenant', modelo: b.modelo || 'gpt-4o', chaveMascarada: 'sk-••••a1B2', vinculadoEm: new Date().toISOString() } } as T;
  if (path === '/config/integracoes/openai/testar') return { ok: true, modelo: 'gpt-4o' } as T;
  if (path === '/config/integracoes/openai' && method === 'DELETE') return { openai: { vinculado: false, origem: 'none', modelo: 'gpt-4o', chaveMascarada: null, vinculadoEm: null } } as T;

  // Aprendizado
  if (path === '/aprendizado/estatisticas') return { total: 213, comJustificativa: 156, produtosTrocados: 64,
    porEntidade: [{ entidade: 'OrcamentoItem', total: 188 }, { entidade: 'Leitura', total: 25 }],
    porDia: [{ dia: '2026-05-24', total: 6 }, { dia: '2026-05-25', total: 9 }, { dia: '2026-05-26', total: 12 }, { dia: '2026-05-27', total: 7 }, { dia: '2026-05-28', total: 14 }, { dia: '2026-05-29', total: 10 }, { dia: '2026-05-30', total: 8 }, { dia: '2026-05-31', total: 5 }, { dia: '2026-06-01', total: 11 }, { dia: '2026-06-02', total: 13 }, { dia: '2026-06-03', total: 16 }, { dia: '2026-06-04', total: 9 }, { dia: '2026-06-05', total: 12 }, { dia: '2026-06-06', total: 4 }] } as T;
  if (path === '/aprendizado/sugestoes') return [
    { tipo: 'TROCA_PRODUTO', chave: 'BMB-050->BMB-075', descricao: 'Troca de produto recorrente (9x). Considere revisar a regra/catálogo.', ocorrencias: 9, exemplo: '“Conjunto motobomba”: BMB-050 → BMB-075' },
    { tipo: 'TROCA_PRODUTO', chave: 'FLT-500->FLT-600', descricao: 'Troca de produto recorrente (6x). Considere revisar a regra/catálogo.', ocorrencias: 6, exemplo: '“Filtro”: FLT-500 → FLT-600 (piscinas maiores)' },
    { tipo: 'REMOCAO', chave: 'Automação WiFi', descricao: 'Item “Automação WiFi” removido com frequência (5x). Produto fora de linha — desativar no catálogo.', ocorrencias: 5, exemplo: 'Automação WiFi' },
    { tipo: 'REMOCAO', chave: 'Kit sauna', descricao: 'Item “Kit sauna” removido com frequência (3x).', ocorrencias: 3, exemplo: 'Kit sauna' },
  ] as T;
  if (path === '/aprendizado/base-conhecimento' && method === 'GET') return [
    { id: 'k1', tipo: 'correcao', conteudo: 'Correção em OrcamentoItem: trocou BMB-050 por BMB-075. Justificativa: cliente pediu mais vazão para piscina de 90m³.', tags: ['correcao:1', 'OrcamentoItem'], createdAt: '2026-06-03' },
    { id: 'k2', tipo: 'correcao', conteudo: 'Correção em OrcamentoItem: trocou TC-40000 por BC-12KW. Justificativa: obra no Sul, bomba de calor mais econômica.', tags: ['correcao:2', 'OrcamentoItem'], createdAt: '2026-05-29' },
    { id: 'k3', tipo: 'correcao', conteudo: 'Correção: removeu Automação WiFi. Justificativa: produto descontinuado pelo fornecedor.', tags: ['correcao:3', 'OrcamentoItem'], createdAt: '2026-05-22' },
    { id: 'k4', tipo: 'correcao', conteudo: 'Correção em Leitura: profundidade 1,5m → 1,4m. Justificativa: cota de projeto conferida em obra.', tags: ['correcao:4', 'Leitura'], createdAt: '2026-05-15' },
    { id: 'k5', tipo: 'correcao', conteudo: 'Correção: clorador salino adicionado em piscinas > 60m³. Justificativa: padrão da casa para baixa manutenção.', tags: ['correcao:5', 'OrcamentoItem'], createdAt: '2026-04-30' },
    { id: 'k6', tipo: 'correcao', conteudo: 'Correção: LED 9W → LED 18W em área gourmet. Justificativa: cliente quer mais luz.', tags: ['correcao:6', 'OrcamentoItem'], createdAt: '2026-04-12' },
  ] as T;
  if (path === '/aprendizado/base-conhecimento/gerar') return { criadas: 18, analisadas: 156 } as T;

  // Auditoria / Acessos
  if (path.startsWith('/audit/recent')) {
    const lim = Number(new URLSearchParams(path.split('?')[1] ?? '').get('limit') ?? 100);
    const base = Date.now();
    const ts = (minusMin: number) => new Date(base - minusMin * 60_000).toISOString();
    const logs = [
      { id: 'al01', acao: 'LOGIN', entidade: 'User', ip: '187.45.12.31', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', createdAt: ts(3), autor: { id: 'u1', nome: 'Carlos Oliveira', email: 'carlos@stillodagua.com.br', role: 'GERENTE' } },
      { id: 'al02', acao: 'CREATE', entidade: 'Orcamento', entidadeId: 'orc1042', ip: '187.45.12.31', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)', createdAt: ts(5), autor: { id: 'u1', nome: 'Carlos Oliveira', email: 'carlos@stillodagua.com.br', role: 'GERENTE' } },
      { id: 'al03', acao: 'APPROVE', entidade: 'Orcamento', entidadeId: 'orc1041', ip: '187.45.12.31', createdAt: ts(8), autor: { id: 'u1', nome: 'Carlos Oliveira', email: 'carlos@stillodagua.com.br', role: 'GERENTE' } },
      { id: 'al04', acao: 'LOGIN', entidade: 'User', ip: '189.61.88.201', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', createdAt: ts(47), autor: { id: 'u2', nome: 'Ana Faria', email: 'ana@stillodagua.com.br', role: 'ORCAMENTISTA' } },
      { id: 'al05', acao: 'CREATE', entidade: 'Obra', entidadeId: 'obra0091', ip: '189.61.88.201', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', createdAt: ts(49), autor: { id: 'u2', nome: 'Ana Faria', email: 'ana@stillodagua.com.br', role: 'ORCAMENTISTA' } },
      { id: 'al06', acao: 'EXPORT', entidade: 'Orcamento', entidadeId: 'orc1040', ip: '189.61.88.201', createdAt: ts(52), autor: { id: 'u2', nome: 'Ana Faria', email: 'ana@stillodagua.com.br', role: 'ORCAMENTISTA' } },
      { id: 'al07', acao: 'LOGIN', entidade: 'User', ip: '200.175.3.18', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', createdAt: ts(180), autor: { id: 'u3', nome: 'Renato Souza', email: 'renato@stillodagua.com.br', role: 'ADMIN' } },
      { id: 'al08', acao: 'UPDATE', entidade: 'Regra', entidadeId: 'reg019', ip: '200.175.3.18', createdAt: ts(185), autor: { id: 'u3', nome: 'Renato Souza', email: 'renato@stillodagua.com.br', role: 'ADMIN' } },
      { id: 'al09', acao: 'LOGIN', entidade: 'User', ip: '177.92.44.7', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)', createdAt: ts(360), autor: { id: 'u4', nome: 'Marcos Lima', email: 'marcos@stillodagua.com.br', role: 'COMERCIAL' } },
      { id: 'al10', acao: 'EXPORT', entidade: 'Orcamento', entidadeId: 'orc1039', ip: '177.92.44.7', createdAt: ts(365), autor: { id: 'u4', nome: 'Marcos Lima', email: 'marcos@stillodagua.com.br', role: 'COMERCIAL' } },
      { id: 'al11', acao: 'LOGIN', entidade: 'User', ip: '187.45.12.31', createdAt: ts(720), autor: { id: 'u1', nome: 'Carlos Oliveira', email: 'carlos@stillodagua.com.br', role: 'GERENTE' } },
      { id: 'al12', acao: 'CREATE', entidade: 'Orcamento', entidadeId: 'orc1040', ip: '187.45.12.31', createdAt: ts(724), autor: { id: 'u1', nome: 'Carlos Oliveira', email: 'carlos@stillodagua.com.br', role: 'GERENTE' } },
    ];
    return logs.slice(0, lim) as T;
  }

  // Dashboards — empresa madura (~1 ano)
  if (path === '/dashboard/operacional') return {
    valorOrcadoMes: 942500, pipelineValor: 1850000, aprovadoValorMes: 624000, ticketMedio: 26060, taxaConversao: 0.75, tempoMedioMin: 11,
    orcamentosHoje: 7, orcamentosMes: 38, aguardandoRevisao: 9, aprovados: 287, enviados: 96,
    funil: { obras: 640, leiturasIa: 583, dimensionamentos: 542, orcamentos: 510, enviados: 479, aprovados: 287 },
    porStatus: [
      { status: 'RASCUNHO', total: 22, valor: 410000 },
      { status: 'EM_REVISAO', total: 9, valor: 286000 },
      { status: 'ENVIADO', total: 96, valor: 1154000 },
      { status: 'APROVADO', total: 287, valor: 7480000 },
      { status: 'RECUSADO', total: 96, valor: 1180000 },
    ],
    tendencia: [
      { mes: '2026-01', total: 27, valor: 640000 }, { mes: '2026-02', total: 31, valor: 760000 }, { mes: '2026-03', total: 34, valor: 880000 },
      { mes: '2026-04', total: 33, valor: 910000 }, { mes: '2026-05', total: 41, valor: 1180000 }, { mes: '2026-06', total: 38, valor: 942500 },
    ],
    ranking: [{ nome: 'Ana Vendas', valor: 1840000 }, { nome: 'Bruno Costa', valor: 1320000 }, { nome: 'Carla Dias', valor: 1115000 }, { nome: 'Diego Martins', valor: 870000 }, { nome: 'Equipe Externa', valor: 540000 }],
    topClientes: [{ nome: 'Construtora Aurora', valor: 1240000 }, { nome: 'Cond. Vila Mar', valor: 980000 }, { nome: 'Resort Costa Azul', valor: 870000 }, { nome: 'Engebras Ltda', valor: 645000 }, { nome: 'Família Andrade', valor: 412000 }],
    ia: { itensIa: 1840, itensRegra: 2960, itensManual: 720, correcoes: 134 },
    atencao: { revisaoParada: 9, obrasSemOrcamento: 14, leiturasRevisar: 6 },
  } as T;
  if (path === '/dashboard/executivo') return { valorOrcadoMes: 942500, tempoMedioMin: 11,
    tendencia: [{ mes: '2025-07', total: 18, valor: 410000 }, { mes: '2025-08', total: 22, valor: 520000 }, { mes: '2025-09', total: 26, valor: 610000 }, { mes: '2025-10', total: 24, valor: 580000 }, { mes: '2025-11', total: 29, valor: 690000 }, { mes: '2025-12', total: 21, valor: 470000 }, { mes: '2026-01', total: 27, valor: 640000 }, { mes: '2026-02', total: 31, valor: 760000 }, { mes: '2026-03', total: 34, valor: 880000 }, { mes: '2026-04', total: 33, valor: 910000 }, { mes: '2026-05', total: 41, valor: 1180000 }, { mes: '2026-06', total: 38, valor: 942500 }],
    porCidade: [{ cidade: 'São Luís', total: 142 }, { cidade: 'Fortaleza', total: 86 }, { cidade: 'Itapema', total: 53 }, { cidade: 'Natal', total: 38 }, { cidade: 'Balneário Camboriú', total: 27 }, { cidade: 'Aquiraz', total: 19 }],
    equipamentos: [{ item: 'Refletor LED embutir', total: 2840 }, { item: 'Motobomba 1/2cv', total: 410 }, { item: 'Kit de tratamento', total: 388 }, { item: 'Filtro Ø500', total: 295 }, { item: 'Trocador de calor', total: 176 }, { item: 'Clorador salino', total: 132 }, { item: 'Bomba de calor 12kW', total: 84 }, { item: 'Cascata inox', total: 71 }],
    fabricantes: [{ fabricante: 'Brustec', total: 2900 }, { fabricante: 'Jacuzzi', total: 640 }, { fabricante: 'Sodramar', total: 520 }, { fabricante: 'TholzPro', total: 260 }, { fabricante: 'Nautilus', total: 84 }, { fabricante: 'Pooltec', total: 71 }] } as T;

  return ({} as T);
}

export function demoExport(formato: string): string {
  if (formato === 'csv') return 'SKU;Descricao;Quantidade;PrecoUnit;Subtotal\nLED-1801;Refletor LED;16;89.90;1438.40\nFLT-500;Filtro Ø500;1;980.00;980.00\nBMB-050;Motobomba 1/2cv;1;740.00;740.00\nTRAT-KIT;Kit tratamento;1;350.00;350.00\n;Instalação;1;3200.00;3200.00\n;;;TOTAL;6708.40';
  if (formato === 'txt') return 'ORÇAMENTO Nº 1042\nObra: Residência Silva\nCliente: Família Silva\n\n- Refletor LED de embutir [LED-1801] | 16 x R$ 89,90 = R$ 1.438,40\n- Filtro Ø500 [FLT-500] | 1 x R$ 980,00 = R$ 980,00\n- Motobomba 1/2cv [BMB-050] | 1 x R$ 740,00 = R$ 740,00\n- Kit de tratamento [TRAT-KIT] | 1 x R$ 350,00 = R$ 350,00\n- Instalação e comissionamento | 1 x R$ 3.200,00 = R$ 3.200,00\n\nTOTAL: R$ 6.708,40';
  return '<!doctype html><html><head><meta charset="utf-8"><title>Orçamento 1042</title></head><body style="font-family:Arial;margin:40px;color:#0f172a"><h1 style="color:#0369a1">STILLO — Orçamento Nº 1042</h1><p>Obra: Residência Silva · Cliente: Família Silva</p><table border="0" cellpadding="8" style="border-collapse:collapse;width:100%"><thead><tr style="background:#f1f5f9;text-align:left"><th>Item</th><th>SKU</th><th style="text-align:right">Qtd</th><th style="text-align:right">Subtotal</th></tr></thead><tbody><tr style="border-bottom:1px solid #e2e8f0"><td>Refletor LED de embutir</td><td>LED-1801</td><td style="text-align:right">16</td><td style="text-align:right">R$ 1.438,40</td></tr><tr style="border-bottom:1px solid #e2e8f0"><td>Filtro Ø500</td><td>FLT-500</td><td style="text-align:right">1</td><td style="text-align:right">R$ 980,00</td></tr><tr style="border-bottom:1px solid #e2e8f0"><td>Motobomba 1/2cv</td><td>BMB-050</td><td style="text-align:right">1</td><td style="text-align:right">R$ 740,00</td></tr><tr style="border-bottom:1px solid #e2e8f0"><td>Kit de tratamento</td><td>TRAT-KIT</td><td style="text-align:right">1</td><td style="text-align:right">R$ 350,00</td></tr><tr><td>Instalação e comissionamento</td><td>—</td><td style="text-align:right">1</td><td style="text-align:right">R$ 3.200,00</td></tr></tbody></table><h2 style="text-align:right;color:#0369a1">Total: R$ 6.708,40</h2></body></html>';
}
