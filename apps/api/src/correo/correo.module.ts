import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Env } from '../config/env.js';
import { CorreoService, TRANSPORTE_CORREO, type TransporteCorreo } from './correo.service.js';

// Registra el transporte real (SMTP) y exporta CorreoService.
@Module({
  providers: [
    {
      provide: TRANSPORTE_CORREO,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TransporteCorreo =>
        nodemailer.createTransport({
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          secure: false,
        }),
    },
    CorreoService,
  ],
  exports: [CorreoService],
})
export class CorreoModule {}
