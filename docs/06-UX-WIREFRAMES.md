# 06 — UX & Wireframes

## 1. Princípios de experiência

> Sensação alvo: **ChatGPT + Notion + ERP moderno**. Premium, mas para quem **não tem afinidade com tecnologia**.

1. **Uma ação principal por tela** (botão grande, claro). Resto é secundário.
2. **Defaults inteligentes** — o sistema já chega com sugestão; o usuário confirma/ajusta.
3. **Zero jargão de TI** — "Gerar dimensionamento", não "Executar pipeline".
4. **Sempre editável + sempre reversível** — nada que a IA faça é irreversível.
5. **Mostrar confiança e fonte** — amarelo = confira; verde = ok; "📎 fonte: catálogo X".
6. **Progressive disclosure** — detalhe técnico fica recolhido até ser pedido.
7. **Responsivo de verdade** — desktop (trabalho), tablet (campo/obra), mobile (consulta).

## 2. Layout administrativo (shell)

```
┌──────────────────────────────────────────────────────────────────┐
│  [≡] STILLO IA        🔍 busca global        ⚙️   🔔   [Avatar ▾]  │  ← topbar
├───────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR   │                                                        │
│           │   ÁREA DE CONTEÚDO                                     │
│ 🏠 Dash   │   (página atual)                                       │
│ 👤 Client.│                                                        │
│ 🏗  Obras │                                                        │
│ 🏊 Pisc.  │                                          ┌───────────┐ │
│ 📐 Dimens.│                                          │  CHAT IA  │ │ ← painel lateral
│ 📄 Orçam. │                                          │  (toggle) │ │   colapsável
│ 📚 Catál. │                                          └───────────┘ │
│ 📦 Produt.│                                                        │
│ ⚙️  Regras│                                                        │
│ 📊 Execut.│                                                        │
└───────────┴──────────────────────────────────────────────────────┘
```

Sidebar colapsa em ícones no tablet e vira drawer no mobile. O **chat de IA** é global (acessível de qualquer tela), com contexto da obra/orçamento aberto.

## 3. Telas (wireframes)

### 3.1 Dashboard operacional
```
┌── Dashboard ─────────────────────────────────────────────┐
│ [Orçam. hoje:12] [Mês:148] [Tempo médio:8min] [Aguard.rev:5]│  ← KPI cards
│ [Aprovados:73] [Enviados:91] [Valor orçado: R$ 1,2M]        │
├──────────────────────────────────────────────────────────┤
│  📈 Orçamentos por dia (Recharts)   │ 🏆 Ranking vendedores │
│  ▁▂▅▇▅▆▇                            │ 1. Ana   2. Bruno ... │
├──────────────────────────────────────────────────────────┤
│  ⏳ Fila de revisão (tabela clicável → abre orçamento)      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Obra → Leitura Inteligente (a tela "mágica")
```
┌── Obra: Residência Silva ───────────────────────────────────┐
│ [⬆ Upload PDF/planta/DWG]   Arquivos: projeto.pdf ✓ planta.jpg│
│                                                               │
│  ┌─ O que a IA encontrou ──────────────  [Confiança: 86%] ─┐ │
│  │ 🏊 Piscina 1   [8,0 × 4,0 × 1,5 m]  Vol≈48m³            │ │
│  │    Sistemas: ☑ LED  ☑ Aquecimento  ⚠ Borda infinita?    │ │
│  │    [✏ editar]                                           │ │
│  │ 🏊 Piscina 2 (Spa) [2,5 × 2,5]  ⚠ profundidade não lida │ │
│  └─────────────────────────────────────────────────────────┘ │
│  Campos em ⚠ amarelo precisam de conferência.                 │
│                         [ Confirmar e continuar → ]           │
└───────────────────────────────────────────────────────────────┘
```
Amarelo = baixa confiança. Tudo editável inline. Nada avança sem o humano confirmar.

### 3.3 Dimensionamento
```
┌── Dimensionamento — Piscina 1 ──────────────────────────────┐
│           [ ⚡ GERAR DIMENSIONAMENTO ]   (botão herói)       │
│  ───────────────────────────────────────────────────────────│
│  Filtragem   │ Bomba 1/2cv + filtro Ø500   │ porque vol 48m³ │
│  Iluminação  │ 4× LED embutir              │ perímetro/1,5   │
│  Aquecimento │ Trocador de calor 40.000kcal│ regra: região   │
│  Tratamento  │ ...                         │ ⓘ ver regra     │
│  Mão de obra │ ...                         │                 │
│  Cada linha mostra a ORIGEM (regra X) — clicável p/ explicar │
│                              [ Montar orçamento → ]          │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Revisão Técnica (human-in-the-loop)
```
┌── Revisão — Orçamento #1042 ───────────────────────  v3 ▾ ──┐
│ Item                 SKU        Qtd  Preço   Origem   Ações   │
│ LED embutir 18W      LED-1801   4    R$ 89   ⚙regra  [↔][✏][🗑]│
│ Bomba 1/2cv          BMB-050    1    R$ 740  🤖IA     [↔][✏][🗑]│
│ + adicionar item                                              │
│ ───────────────────────────────────────────────────────────  │
│ Ao TROCAR/EDITAR → pede justificativa → vira aprendizado.     │
│ [↔] = trocar por substituto/compatível (sugestão IA)         │
│                    Total: R$ 12.480   [ Aprovar ✓ ]          │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Chat IA (painel lateral, global)
```
┌─ IA Técnica ──────────────[x]┐
│ Você: Qual bomba p/ 80m³?     │
│ IA: Para 80m³ com turnover 6h │
│  recomendo a Bomba X (BMB-100)│
│  📎 fonte: Catálogo Fab.Y     │
│  Alternativa: BMB-090         │
│ ─────────────────────────────│
│ [ pergunte algo...        ➤ ] │
└───────────────────────────────┘
```

### 3.6 Regras (admin, sem código)
```
┌── Motor de Regras ───────────────────────────────────────────┐
│ [+ Nova regra]                       Categoria: [Iluminação ▾]│
│ ✅ LED a cada 1,5m            prioridade 100   [editar][simular]│
│ ✅ Borda infinita > 6m larg. prioridade 90    [editar][simular]│
│ ──── Editor (sem programar) ────────────────────────────────  │
│  QUANDO  [piscina.largura] [ ≥ ] [ 6 ]  [+ condição]          │
│  ENTÃO   [adicionar item ▾] categoria [LED] qtd [perímetro/1,5]│
│                          [ Simular ▶ ]   [ Salvar ]           │
└──────────────────────────────────────────────────────────────┘
```

### 3.7 Dashboard executivo (diretoria)
```
┌── Executivo ─────────────────────────────────────────────────┐
│ Valor orçado (mês) │ Tempo médio │ Margem média │ Conversão   │
│ Equip. mais usados (barras) │ Fabricante mais vendido (pizza) │
│ Mapa por cidade │ Tendência 6 meses (linha)                   │
└──────────────────────────────────────────────────────────────┘
```

## 4. Estados, acessibilidade e feedback
- **Loading**: skeletons (nunca tela branca). Jobs longos → progresso ("Lendo projeto… 2/3").
- **Erro**: mensagem humana + ação ("Não consegui ler este PDF. Tente outro ou revise manual").
- **Vazio**: empty states que ensinam o próximo passo.
- **A11y**: contraste AA, navegação por teclado, foco visível, labels em todos os campos.
- **Toasts** para confirmação de ações; **diálogos** só para ações destrutivas.

## 5. Design system
- Tokens Tailwind (cores, espaçamento, raio, sombra) + **shadcn/ui** como base de componentes.
- Tipografia legível (tamanho generoso — público pouco técnico).
- Ícones **lucide**. Gráficos **Recharts**.
- Tema claro/escuro; densidade confortável por padrão.
