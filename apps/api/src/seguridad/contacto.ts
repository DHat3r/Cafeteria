// Normalización de datos de contacto. Se aplica antes de cifrar y de calcular
// el HMAC: así "Ana@Mail.cl " y "ana@mail.cl" producen el mismo HMAC y se asocian.

// Sin espacios, ni comas, punto y coma, <>, comillas, paréntesis, corchetes o barras invertidas:
// nodemailer interpreta esos caracteres como varias direcciones o como "Nombre <dirección>".
const CARACTER_VALIDO = String.raw`[^\s@,;<>"()\[\]\\]`;
const FORMA_CORREO = new RegExp(`^${CARACTER_VALIDO}+@${CARACTER_VALIDO}+\\.${CARACTER_VALIDO}+$`);

export function normalizarCorreo(valor: string | null | undefined): string | null {
  const correo = (valor ?? '').trim().toLowerCase();
  return FORMA_CORREO.test(correo) ? correo : null;
}

// Teléfono móvil chileno en formato +569XXXXXXXX. Acepta espacios, guiones y
// el prefijo 56 con o sin "+". Cualquier otro formato se considera inválido.
export function normalizarTelefono(valor: string | number | null | undefined): string | null {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length === 9 && digitos.startsWith('9')) return `+56${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('569')) return `+${digitos}`;
  return null;
}
