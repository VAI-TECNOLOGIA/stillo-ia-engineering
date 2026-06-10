import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { permissionsForRole, type Role } from '../../common/rbac/permissions';
import type { JwtPayload } from './jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(
    email: string,
    senha: string,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair & { user: SafeUser }> {
    const user = await this.prisma.user.findFirst({ where: { email, ativo: true } });
    if (!user || !(await bcrypt.compare(senha, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { ultimoLogin: new Date() } });
    const tokens = await this.issueTokens(user.id, user.tenantId, user.role, randomUUID());

    // Trilha de auditoria — LOGIN
    void this.audit.log({
      tenantId: user.tenantId,
      autorId: user.id,
      acao: 'LOGIN',
      entidade: 'User',
      entidadeId: user.id,
      depois: { email: user.email, role: user.role },
      ip,
      userAgent,
    });

    return { ...tokens, user: this.toSafeUser(user) };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
    // Detecção de reuso: token já revogado sendo usado → revoga a família inteira.
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familia: stored.familia, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Reuso de refresh token detectado. Sessões revogadas.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.ativo) throw new UnauthorizedException('Usuário inativo.');

    // Rotação: revoga o atual e emite novo na mesma família.
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(user.id, user.tenantId, user.role, stored.familia);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { ...this.toSafeUser(user), permissions: permissionsForRole(user.role as Role) };
  }

  // ── internos ──────────────────────────────────────────────────────────────

  private async issueTokens(userId: string, tenantId: string, role: string, familia: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, tenantId, role };
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 2592000);

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      expiresIn: accessTtl,
    });

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(refreshToken),
        familia,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: { id: string; nome: string; email: string; role: string; tenantId: string }): SafeUser {
    return { id: user.id, nome: user.nome, email: user.email, role: user.role, tenantId: user.tenantId };
  }
}

export interface SafeUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  tenantId: string;
}
