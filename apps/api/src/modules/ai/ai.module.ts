import { Global, Module } from '@nestjs/common';
import { AI_PROVIDER, AI_PROVIDERS } from './ai.types';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { AiService } from './ai.service';

/**
 * Adapters de IA (ADR-0003). OpenAI é o default (AI_PROVIDER, usado por RAG/chat).
 * AI_PROVIDERS expõe TODOS os adapters p/ o consenso multi-IA (Gemini+Claude+GPT).
 */
@Global()
@Module({
  providers: [
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: OpenAiProvider },
    {
      provide: AI_PROVIDERS,
      useFactory: (openai: OpenAiProvider, anthropic: AnthropicProvider, gemini: GeminiProvider) =>
        [openai, anthropic, gemini],
      inject: [OpenAiProvider, AnthropicProvider, GeminiProvider],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
