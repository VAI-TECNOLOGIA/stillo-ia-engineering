-- Motor de leitura v2: classificação por disciplina + extração especializada +
-- consolidação com evidências + validação + confirmação humana + trava de orçamento.

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM (
  'ARQUITETONICO', 'HIDRAULICO', 'ELETRICO', 'CORTES', 'DETALHES_EXECUTIVOS',
  'CASA_DE_MAQUINAS', 'EQUIPAMENTOS', 'MEMORIAL_DESCRITIVO', 'ESTRUTURAL',
  'IMPLANTACAO', 'PAISAGISMO', 'LAZER', 'DESCONHECIDO'
);

-- CreateEnum
CREATE TYPE "DocAnaliseStatus" AS ENUM (
  'PENDENTE', 'CLASSIFICANDO', 'CLASSIFICADO', 'EXTRAINDO', 'EXTRAIDO', 'FALHA'
);

-- CreateEnum
CREATE TYPE "ProjectAnalysisStatus" AS ENUM (
  'EM_ANALISE', 'CONSOLIDADO', 'COM_PENDENCIAS', 'AGUARDANDO_CONFIRMACAO',
  'CONFIRMADO', 'BLOQUEADO', 'FALHA'
);

-- CreateTable
CREATE TABLE "ProjectAnalysis" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "obraId" TEXT NOT NULL,
  "status" "ProjectAnalysisStatus" NOT NULL DEFAULT 'EM_ANALISE',
  "consolidacao" JSONB NOT NULL DEFAULT '{}',
  "validacao" JSONB NOT NULL DEFAULT '{}',
  "resumo" JSONB NOT NULL DEFAULT '{}',
  "confirmadoById" TEXT,
  "confirmadoEm" TIMESTAMP(3),
  "geradoById" TEXT,
  "erro" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAnalysis" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectAnalysisId" TEXT NOT NULL,
  "arquivoId" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL DEFAULT 'DESCONHECIDO',
  "classificacao" JSONB NOT NULL DEFAULT '{}',
  "status" "DocAnaliseStatus" NOT NULL DEFAULT 'PENDENTE',
  "extracao" JSONB NOT NULL DEFAULT '{}',
  "modeloIa" TEXT,
  "erro" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAnalysis_tenantId_idx" ON "ProjectAnalysis"("tenantId");
CREATE INDEX "ProjectAnalysis_obraId_createdAt_idx" ON "ProjectAnalysis"("obraId", "createdAt");
CREATE INDEX "DocumentAnalysis_tenantId_idx" ON "DocumentAnalysis"("tenantId");
CREATE INDEX "DocumentAnalysis_projectAnalysisId_idx" ON "DocumentAnalysis"("projectAnalysisId");
CREATE INDEX "DocumentAnalysis_arquivoId_idx" ON "DocumentAnalysis"("arquivoId");

-- AddForeignKey
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_obraId_fkey"
  FOREIGN KEY ("obraId") REFERENCES "Obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAnalysis" ADD CONSTRAINT "ProjectAnalysis_confirmadoById_fkey"
  FOREIGN KEY ("confirmadoById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_projectAnalysisId_fkey"
  FOREIGN KEY ("projectAnalysisId") REFERENCES "ProjectAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_arquivoId_fkey"
  FOREIGN KEY ("arquivoId") REFERENCES "Arquivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
