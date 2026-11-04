// Variables de entorno de la API, validadas al arrancar.
// Si falta una o una clave tiene un largo inválido, la API no arranca:
// es mejor fallar al inicio que cifrar datos con una clave mal puesta.

export type Env = {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  CLIENTES_ENC_KEY: string;
  CLIENTES_HMAC_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  MAIL_FROM: string;
  PUBLIC_WEB_URL: string;
};

const REQUERIDAS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENTES_ENC_KEY',
  'CLIENTES_HMAC_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'SMTP_HOST',
  'MAIL_FROM',
  'PUBLIC_WEB_URL',
] as const;

function bytesBase64(valor: string): number {
  return Buffer.from(valor, 'base64').length;
}

export function validarEnv(raw: Record<string, unknown>): Env {
  const errores: string[] = [];
  const texto = (nombre: string) => {
    const valor = raw[nombre];
    return typeof valor === 'string' || typeof valor === 'number' ? String(valor).trim() : '';
  };

  for (const nombre of REQUERIDAS) {
    if (!texto(nombre)) errores.push(`${nombre} es obligatoria`);
  }
  if (texto('CLIENTES_ENC_KEY') && bytesBase64(texto('CLIENTES_ENC_KEY')) !== 32) {
    errores.push('CLIENTES_ENC_KEY debe ser de 32 bytes en base64 (AES-256)');
  }
  if (texto('CLIENTES_HMAC_KEY') && bytesBase64(texto('CLIENTES_HMAC_KEY')) < 32) {
    errores.push('CLIENTES_HMAC_KEY debe tener al menos 32 bytes en base64');
  }
  if (texto('JWT_SECRET') && texto('JWT_SECRET').length < 32) {
    errores.push('JWT_SECRET debe tener al menos 32 caracteres');
  }
  if (texto('ADMIN_PASSWORD') && texto('ADMIN_PASSWORD').length < 8) {
    errores.push('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }
  if (errores.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errores.join('\n- ')}`);
  }

  return {
    PORT: Number(texto('PORT') || 3001),
    DATABASE_URL: texto('DATABASE_URL'),
    JWT_SECRET: texto('JWT_SECRET'),
    CLIENTES_ENC_KEY: texto('CLIENTES_ENC_KEY'),
    CLIENTES_HMAC_KEY: texto('CLIENTES_HMAC_KEY'),
    ADMIN_EMAIL: texto('ADMIN_EMAIL').toLowerCase(),
    ADMIN_PASSWORD: texto('ADMIN_PASSWORD'),
    SMTP_HOST: texto('SMTP_HOST'),
    SMTP_PORT: Number(texto('SMTP_PORT') || 1025),
    MAIL_FROM: texto('MAIL_FROM'),
    PUBLIC_WEB_URL: texto('PUBLIC_WEB_URL').replace(/\/$/, ''),
  };
}
