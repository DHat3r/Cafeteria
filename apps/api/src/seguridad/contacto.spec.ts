import { normalizarCorreo, normalizarTelefono } from './contacto.js';

describe('normalizarCorreo', () => {
  it('recorta y pasa a minúsculas', () => {
    expect(normalizarCorreo('  Ana.Perez@Mail.CL ')).toBe('ana.perez@mail.cl');
  });

  it.each([
    '',
    'sin-arroba',
    'a@b',
    'con espacio@mail.cl',
    // Caracteres que nodemailer interpretaría como varias direcciones o como un nombre con <>:
    'ana@mail.cl,otra@mail.cl',
    'ana@mail.cl;otra@mail.cl',
    '<ana@mail.cl>',
    '"ana"@mail.cl',
    'Ana <ana@mail.cl>',
    'ana@mail.cl,x.cl',
    null,
    undefined,
  ])(
    'rechaza %s',
    (valor) => {
      expect(normalizarCorreo(valor)).toBeNull();
    },
  );
});

describe('normalizarTelefono', () => {
  it.each([
    ['912345678', '+56912345678'],
    ['9 1234 5678', '+56912345678'],
    ['+56 9 1234-5678', '+56912345678'],
    ['56912345678', '+56912345678'],
    [912345678, '+56912345678'],
  ])('normaliza %s', (valor, esperado) => {
    expect(normalizarTelefono(valor)).toBe(esperado);
  });

  it.each(['', '12345678', '812345678', '+1 555 123 4567', null])('rechaza %s', (valor) => {
    expect(normalizarTelefono(valor)).toBeNull();
  });
});
