import { ConfigService } from '@nestjs/config';
import { CorreoService, construirTexto, type MensajeCorreo, type TransporteCorreo } from './correo.service.js';

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
