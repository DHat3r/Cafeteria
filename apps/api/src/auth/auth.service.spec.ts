import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

function crearServicio(adminEnBase: { id: number; email: string; passwordHash: string } | null) {
  const prisma = {
    admin: {
      findUnique: vi.fn().mockResolvedValue(adminEnBase),
      count: vi.fn().mockResolvedValue(1),
    },
  };
  const jwt = new JwtService({ secret: 'x'.repeat(32) });
  const config = new ConfigService({ ADMIN_EMAIL: 'admin@cafeteria.test', ADMIN_PASSWORD: 'clave-de-prueba' });
  return new AuthService(prisma as never, jwt, config as never);
}

// Mensaje del error con que termina un intento de login (o 'sin error' si funcionó).
async function mensajeDeError(intento: Promise<unknown>): Promise<string> {
  try {
    await intento;
    return 'sin error';
  } catch (error) {
    return (error as Error).message;
  }
}

describe('AuthService.login', () => {
  it('compara la contraseña con bcrypt también cuando el correo no existe', async () => {
    // Si no se comparara, un correo inexistente respondería mucho más rápido que una clave
    // incorrecta, y esa diferencia de tiempo permitiría descubrir cuál es el correo del admin.
    const servicio = crearServicio(null);
    await servicio.onApplicationBootstrap();
    const comparar = vi.spyOn(bcrypt, 'compare');

    await expect(servicio.login('nadie@cafeteria.test', 'cualquier-clave')).rejects.toBeInstanceOf(UnauthorizedException);

    expect(comparar).toHaveBeenCalledTimes(1);
    comparar.mockRestore();
  });

  it('un correo inexistente y una contraseña incorrecta dan el mismo error', async () => {
    const hash = await bcrypt.hash('la-clave-buena', 4);
    const conAdmin = crearServicio({ id: 1, email: 'admin@cafeteria.test', passwordHash: hash });
    const sinAdmin = crearServicio(null);
    await sinAdmin.onApplicationBootstrap();

    const porClave = await mensajeDeError(conAdmin.login('admin@cafeteria.test', 'otra-clave'));
    const porCorreo = await mensajeDeError(sinAdmin.login('nadie@cafeteria.test', 'otra-clave'));

    expect(porClave).toBe('Correo o contraseña incorrectos');
    expect(porCorreo).toBe(porClave);
  });

  it('entrega un token con la contraseña correcta', async () => {
    const hash = await bcrypt.hash('la-clave-buena', 4);
    const servicio = crearServicio({ id: 1, email: 'admin@cafeteria.test', passwordHash: hash });

    const { token } = await servicio.login('Admin@Cafeteria.test', 'la-clave-buena');

    expect(token.split('.')).toHaveLength(3);
  });
});
