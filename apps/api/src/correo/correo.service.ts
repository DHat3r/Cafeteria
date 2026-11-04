import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

export const TRANSPORTE_CORREO = Symbol('TRANSPORTE_CORREO');

// Lo mínimo que necesitamos de nodemailer; permite probar con un transporte simulado.
export type TransporteCorreo = {
  sendMail(opciones: {
    from: string;
    to: string;
    subject: string;
    text: string;
    headers?: Record<string, string>;
  }): Promise<unknown>;
};

export type MensajeCorreo = {
  para: string;
  nombre: string;
  asunto: string;
  mensaje: string;
  enlaceBaja: string;
};

// Función pura y exportada: texto plano del correo.
export function construirTexto(nombre: string, mensaje: string, enlaceBaja: string): string {
  return (
    `Hola ${nombre},` +
    '\n\n' +
    mensaje +
    '\n\n' +
    '--' +
    '\n' +
    'Recibes este correo porque te registraste para recibir ofertas.' +
    '\n' +
    `Para dejar de recibirlas entra a: ${enlaceBaja}`
  );
}

// Un salto de línea en un encabezado permite inyectar otros encabezados (por ejemplo Bcc).
const SALTO_DE_LINEA = /[\r\n]/;

@Injectable()
export class CorreoService {
  constructor(
    @Inject(TRANSPORTE_CORREO) private readonly transporte: TransporteCorreo,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Envía un correo. Lanza el error del transporte si falla (el que llama decide qué hacer).
  async enviar(m: MensajeCorreo): Promise<void> {
    if ([m.para, m.asunto, m.nombre].some((valor) => SALTO_DE_LINEA.test(valor))) {
      throw new Error('Dato de correo inválido');
    }

    await this.transporte.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: m.para,
      subject: m.asunto,
      text: construirTexto(m.nombre, m.mensaje, m.enlaceBaja),
      headers: { 'List-Unsubscribe': `<${m.enlaceBaja}>` },
    });
  }
}
