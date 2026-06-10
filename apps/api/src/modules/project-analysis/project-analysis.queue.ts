import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ProjectAnalysisProcessor } from './project-analysis.processor';

/**
 * Fila do motor de leitura v2 — mesmo contrato da LeituraQueue:
 *  - QUEUE_DRIVER=inline (default): processa na hora (dev sem Redis)
 *  - QUEUE_DRIVER=bullmq          : enfileira no Redis (produção)
 */
@Injectable()
export class ProjectAnalysisQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectAnalysisQueue.name);
  private readonly driver = (process.env.QUEUE_DRIVER ?? 'inline').toLowerCase();
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly processor: ProjectAnalysisProcessor) {}

  onModuleInit(): void {
    if (this.driver !== 'bullmq') {
      this.logger.log('Fila project-analysis em modo INLINE.');
      return;
    }
    const connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
    this.queue = new Queue('project-analysis', { connection });
    this.worker = new Worker(
      'project-analysis',
      async (job) => { await this.processor.process(job.data.projectAnalysisId as string); },
      { connection },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Job ${job?.id} falhou: ${err.message}`));
    this.logger.log('Fila BullMQ "project-analysis" ativa.');
  }

  async enqueue(projectAnalysisId: string): Promise<void> {
    if (this.driver === 'bullmq' && this.queue) {
      await this.queue.add('processar', { projectAnalysisId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } else {
      await this.processor.process(projectAnalysisId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
