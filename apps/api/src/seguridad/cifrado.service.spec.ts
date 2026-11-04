import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { CifradoService } from './cifrado.service.js';

function crearServicio(): CifradoService {
  const config = new ConfigService({
    CLIENTES_ENC_KEY: randomBytes(32).toString('base64'),
    CLIENTES_HMAC_KEY: randomBytes(32).toString('base64'),
  });
  return new CifradoService(config as never);
}

describe('CifradoService', () => {
  const servicio = crearServicio();

  it('descifrar devuelve el texto original', () => {
    const guardado = servicio.cifrar('ana@mail.cl');

    expect(servicio.descifrar(guardado)).toBe('ana@mail.cl');
  });

  it('el valor guardado no contiene el texto plano', () => {
    const guardado = servicio.cifrar('ana@mail.cl');

    expect(guardado).not.toContain('ana');
    expect(guardado.startsWith('v1:')).toBe(true);
  });

  it('cifrar dos veces lo mismo da resultados distintos (IV aleatorio)', () => {
    expect(servicio.cifrar('ana@mail.cl')).not.toBe(servicio.cifrar('ana@mail.cl'));
  });

  it('detecta un texto cifrado modificado', () => {
    const [v, iv, tag, cifrado] = servicio.cifrar('ana@mail.cl').split(':');
    const alterado = Buffer.from(cifrado, 'base64');
    alterado[0] ^= 0xff;

    expect(() => servicio.descifrar([v, iv, tag, alterado.toString('base64')].join(':'))).toThrow();
  });

  it('no descifra con otra clave', () => {
    const guardado = servicio.cifrar('ana@mail.cl');

    expect(() => crearServicio().descifrar(guardado)).toThrow();
  });

  it('el HMAC es determinista y depende de la clave', () => {
    expect(servicio.hmac('ana@mail.cl')).toBe(servicio.hmac('ana@mail.cl'));
    expect(servicio.hmac('ana@mail.cl')).not.toBe(crearServicio().hmac('ana@mail.cl'));
  });
});
