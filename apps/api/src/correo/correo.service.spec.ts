import { ConfigService } from '@nestjs/config';
import { CorreoService, construirTexto, construirTextoEnlaceTarjeta, type MensajeCorreo, type TransporteCorreo } from './correo.service.js';

const remitente = 'Cafetería <ofertas@cafeteria.test>';

const mensajeBase: MensajeCorreo = {
  para: 'ana@mail.cl',
  nombre: 'Ana',
  asunto: 'Oferta de la semana',
  mensaje: 'Café doble por el precio de uno.',
  enlaceBaja: 'https://cafeteria.test/baja/abc123',
};

function crearServicio(sendMail: TransporteCorreo['sendMail']): CorreoService {
  const config = new ConfigService({ MAIL_FROM: remitente });
  return new CorreoService({ sendMail }, config as never);
}

describe('CorreoService', () => {
  it('construirTexto produce el texto exacto del correo', () => {
    const texto = construirTexto('Ana', 'Café doble por el precio de uno.', 'https://cafeteria.test/baja/abc123');

    expect(texto).toBe(
      'Hola Ana,\n\n' +
        'Café doble por el precio de uno.\n\n' +
        '--\n' +
        'Recibes este correo porque te registraste para recibir ofertas.\n' +
        'Para dejar de recibirlas entra a: https://cafeteria.test/baja/abc123',
    );
  });

  it('enviar llama a sendMail una vez con from, to, subject, text y el header List-Unsubscribe', async () => {
    const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockResolvedValue({});
    const servicio = crearServicio(sendMail);

    await servicio.enviar(mensajeBase);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: remitente,
      to: 'ana@mail.cl',
      subject: 'Oferta de la semana',
      text: construirTexto('Ana', 'Café doble por el precio de uno.', 'https://cafeteria.test/baja/abc123'),
      headers: { 'List-Unsubscribe': '<https://cafeteria.test/baja/abc123>' },
    });
  });

  it('el texto enviado contiene el enlace de baja', async () => {
    const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockResolvedValue({});
    const servicio = crearServicio(sendMail);

    await servicio.enviar(mensajeBase);

    const enviado = sendMail.mock.calls[0][0];
    expect(enviado.text).toContain('https://cafeteria.test/baja/abc123');
  });

  it('si el transporte falla, enviar rechaza con ese mismo error', async () => {
    const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockRejectedValue(new Error('SMTP caído'));
    const servicio = crearServicio(sendMail);

    await expect(servicio.enviar(mensajeBase)).rejects.toThrow('SMTP caído');
  });

  it.each(['para', 'asunto', 'nombre'] as const)(
    'rechaza un salto de línea en %s y no envía nada',
    async (campo) => {
      const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockResolvedValue({});
      const servicio = crearServicio(sendMail);

      await expect(servicio.enviar({ ...mensajeBase, [campo]: 'Ana\r\nBcc: otro@mail.cl' })).rejects.toThrow(
        'Dato de correo inválido',
      );
      expect(sendMail).not.toHaveBeenCalled();
    },
  );
});

describe('CorreoService.enviarEnlaceTarjeta', () => {
  const enlace = { para: 'ana@mail.cl', nombre: 'Ana', enlace: 'https://cafeteria.test/socio/abc123' };

  it('envía un correo transaccional con el enlace y sin encabezado List-Unsubscribe', async () => {
    const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockResolvedValue({});
    const servicio = crearServicio(sendMail);

    await servicio.enviarEnlaceTarjeta(enlace);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: remitente,
      to: 'ana@mail.cl',
      subject: 'Tu tarjeta de socio',
      text: construirTextoEnlaceTarjeta('Ana', 'https://cafeteria.test/socio/abc123'),
    });
  });

  it('el texto contiene el enlace y avisa que no hay que compartirlo', () => {
    const texto = construirTextoEnlaceTarjeta('Ana', 'https://cafeteria.test/socio/abc123');

    expect(texto).toContain('Hola Ana,');
    expect(texto).toContain('https://cafeteria.test/socio/abc123');
    expect(texto).toContain('No lo compartas');
  });

  it.each(['para', 'nombre'] as const)('rechaza un salto de línea en %s y no envía nada', async (campo) => {
    const sendMail = vi.fn<TransporteCorreo['sendMail']>().mockResolvedValue({});
    const servicio = crearServicio(sendMail);

    await expect(servicio.enviarEnlaceTarjeta({ ...enlace, [campo]: 'Ana\r\nBcc: otro@mail.cl' })).rejects.toThrow(
      'Dato de correo inválido',
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
});
