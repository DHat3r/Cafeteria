import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import type { Env } from '../config/env.js';

const ALGORITMO = 'aes-256-gcm';
const VERSION = 'v1';

// Cifra los datos personales antes de guardarlos y calcula su HMAC para buscarlos.
// - AES-256-GCM: cifra y además detecta si alguien modificó el texto cifrado (tag).
// - IV aleatorio por valor: el mismo correo cifrado dos veces da textos distintos.
// - HMAC-SHA256: huella determinista del valor; sin la clave no se puede recalcular,
//   así que un atacante con la base no puede probar correos conocidos.
@Injectable()
export class CifradoService {
  private readonly claveCifrado: Buffer;
  private readonly claveHmac: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.claveCifrado = Buffer.from(config.get('CLIENTES_ENC_KEY', { infer: true }), 'base64');
    this.claveHmac = Buffer.from(config.get('CLIENTES_HMAC_KEY', { infer: true }), 'base64');
  }

  cifrar(texto: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITMO, this.claveCifrado, iv);
    const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), tag.toString('base64'), cifrado.toString('base64')].join(':');
  }

  descifrar(guardado: string): string {
    const [version, iv, tag, cifrado] = guardado.split(':');
    if (version !== VERSION || !iv || !tag || !cifrado) {
      throw new Error('Formato de dato cifrado desconocido');
    }
    const decipher = createDecipheriv(ALGORITMO, this.claveCifrado, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(cifrado, 'base64')), decipher.final()]).toString('utf8');
  }

  hmac(valorNormalizado: string): string {
    return createHmac('sha256', this.claveHmac).update(valorNormalizado).digest('hex');
  }
}
