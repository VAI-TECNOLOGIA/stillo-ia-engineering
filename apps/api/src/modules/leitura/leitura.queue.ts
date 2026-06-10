import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { LeituraProcessor } from './leitura.processor';

/**
 * Enfileiramento da leitura. Dois modos (env QUEUE_DRIVER):
 *  - "inline"  (default): processa na hora — útil em dev sem Redis.
 *  - "bullmq"            : enfileira no Redis; worker processa async (produção).
 */
@Injectable()
export class LeituraQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeituraQueue.name);
  private readonly driver = (process.env.QUEUE_DRIVER ?? 'inline').toLowerCase();
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly processor: LeituraProcessor) {}

  onModuleInit(): void {
    if (this.driver !== 'bullmq') {
      this.logger.log('Fila em modo INLINE (defina QUEUE_DRIVER=bullmq + Redis para processamento assíncrono).');
      return;
    }
    const connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    };
    this.queue = new Queue('leitura', { connection });
    this.worker = new Worker(
      'leitura',
      async (job) => { await this.processor.process(job.data.leituraId as string); },
      { connection },
    );
    this.worker.on('failed', (job, err) => this.logger.error(`Job ${job?.id} falhou: ${err.message}`));
    this.logger.log('Fila BullMQ "leitura" ativa.');
  }

  async enqueue(leituraId: string): Promise<void> {
    if (this.driver === 'bullmq' && this.queue) {
      await this.queue.add('processar', { leituraId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } else {
      await this.processor.process(leituraId);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
