import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { CifradoService } from '../seguridad/cifrado.service.js';
import { ClientesService } from './clientes.service.js';

const cifrado = new CifradoService(
  new ConfigService({
    CLIENTES_ENC_KEY: randomBytes(32).toString('base64'),
    CLIENTES_HMAC_KEY: randomBytes(32).toString('base64'),
  }) as never,
);

const dto = { nombre: 'Ana', correo: 'ana@mail.cl', consentimiento: true } as const;

// Doble de Prisma: el cliente no existe cuando se busca, pero otro registro simultáneo lo crea
// antes del INSERT, así que el INSERT choca con el índice único.
function crearServicio(errorAlCrear: Error) {
  const prisma = {
    cliente: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockRejectedValue(errorAlCrear),
      update: vi.fn(),
    },
    venta: { updateMany: vi.fn() },
  };
  return { servicio: new ClientesService(prisma as never, cifrado), prisma };
}

describe('ClientesService.registrar', () => {
  it('responde igual si un registro simultáneo ya creó al cliente (violación de índice único)', async () => {
    const { servicio, prisma } = crearServicio(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));

    const respuesta = await servicio.registrar(dto);

    expect(respuesta.mensaje).toContain('Te avisaremos');
    expect(prisma.cliente.create).toHaveBeenCalledTimes(1);
  });

  it('no se traga los demás errores de base de datos', async () => {
    const { servicio } = crearServicio(Object.assign(new Error('disco lleno'), { code: 'P1008' }));

    await expect(servicio.registrar(dto)).rejects.toThrow('disco lleno');
  });
});
