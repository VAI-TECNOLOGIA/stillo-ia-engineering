import { Global, Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai.types';
import { OpenAiProvider } from './openai.provider';
import { AiService } from './ai.service';

/**
 * Seleção do provider por env AI_PROVIDER (default: openai). Anthropic/Azure
 * entram como novos adapters sem tocar no domínio (ADR-0003).
 */
@Global()
@Module({
  providers: [
    OpenAiProvider,
    { provide: AI_PROVIDER, useExisting: OpenAiProvider },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
