import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { LoginResponse } from '@cafeteria/shared';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Si la base no tiene admins, crea el primero con ADMIN_EMAIL y ADMIN_PASSWORD.
  // Así `docker compose up` deja la app lista para entrar, sin un paso manual.
  async onApplicationBootstrap(): Promise<void> {
    if ((await this.prisma.admin.count()) > 0) return;
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    const passwordHash = await bcrypt.hash(this.config.get('ADMIN_PASSWORD', { infer: true }), 12);
    await this.prisma.admin.create({ data: { email, passwordHash } });
    this.logger.log('Admin inicial creado a partir de ADMIN_EMAIL');
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Mismo error si el correo no existe o la clave es incorrecta: no revela qué falló.
    const valida = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !valida) throw new UnauthorizedException('Correo o contraseña incorrectos');

    const token = await this.jwt.signAsync({ sub: admin.id, email: admin.email });
    return { token };
  }
}
