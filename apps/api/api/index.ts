// ─────────────────────────────────────────────────────────────────────────────
// Adaptador SERVERLESS do NestJS para a Vercel.
// A Vercel não roda servidor de longa duração: cada request entra por esta função.
// Estratégia: bootstrap do Nest UMA vez (cache entre invocações "quentes") e
// encaminha a request para o Express interno do Nest.
//
// IMPORTANTE: importamos o AppModule JÁ COMPILADO de ../dist (gerado por `nest build`),
// porque o bundler da Vercel (esbuild) não emite metadata de decorators — o tsc do
// Nest emite. Por isso o buildCommand roda `prisma generate && nest build` antes.
// ─────────────────────────────────────────────────────────────────────────────
import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: Handler | null = null;

async function getServer(): Promise<Handler> {
  if (cached) return cached;

  const express = (await import('express')).default;
  const { NestFactory } = await import('@nestjs/core');
  const { ExpressAdapter } = await import('@nestjs/platform-express');
  const { ValidationPipe } = await import('@nestjs/common');
  // dist é gerado no build (nest build) — caminho relativo a apps/api/api/
  const { AppModule } = await import('../dist/app.module.js');

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  cached = expressApp as unknown as Handler;
  return cached;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const server = await getServer();
  server(req, res);
}
