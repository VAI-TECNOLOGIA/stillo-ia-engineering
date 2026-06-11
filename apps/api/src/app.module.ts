import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthController } from './common/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { RuleEngineModule } from './modules/rule-engine/rule-engine.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ObrasModule } from './modules/obras/obras.module';
import { ArquivosModule } from './modules/arquivos/arquivos.module';
import { AiModule } from './modules/ai/ai.module';
import { ConfigIntegracoesModule } from './modules/config/config.module';
import { LeituraModule } from './modules/leitura/leitura.module';
import { ProjectAnalysisModule } from './modules/project-analysis/project-analysis.module';
import { DiagModule } from './common/health/diag.module';
import { RegrasModule } from './modules/regras/regras.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { IaChatModule } from './modules/ia-chat/ia-chat.module';
import { OrcamentosModule } from './modules/orcamentos/orcamentos.module';
import { AprendizadoModule } from './modules/aprendizado/aprendizado.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

/**
 * Módulo raiz. À medida que as fases do roadmap avançam, novos módulos de
 * domínio entram aqui (Leitura, Piscinas, Catalogos, Produtos, IA, Orcamentos,
 * Revisao, Aprendizado, Exportacao, Dashboard, Queue).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    // Rate limiting global (120 req/min por IP); rotas de IA têm limite mais apertado.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    StorageModule,
    AiModule,
    AuthModule,
    RuleEngineModule,
    // Fase 1 — Comercial & Obras
    ClientesModule,
    ObrasModule,
    ArquivosModule,
    // Fase 2 — Leitura Inteligente + Integrações
    ConfigIntegracoesModule,
    LeituraModule,
    // Motor de leitura v2 — classificação por disciplina + consolidação com evidências
    ProjectAnalysisModule,
    // Diagnóstico de produção (smoke-test de rasterização/OCR — público)
    DiagModule,
    // Fase 3 — Regras (editor visual) + Dimensionamento
    RegrasModule,
    // Fase 4 — Produtos, Catálogos & RAG
    ProdutosModule,
    CatalogosModule,
    IaChatModule,
    // Fase 5 — Orçamento, Revisão & Exportação
    OrcamentosModule,
    // Fase 6 — Aprendizado
    AprendizadoModule,
    // Fase 7 — Dashboards executivos
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
