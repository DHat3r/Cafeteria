// Genera docs/ejemplo-ventas.xlsx: un Excel de demostración con ventas FALSAS,
// con el formato que exporta el sistema de caja de la cafetería. Sirve para
// probar la importación sin usar datos reales.
// Uso: npm run excel:ejemplo -w @cafeteria/api (desde la raíz del repo)
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const SEMILLA = 42;
const TOTAL_VENTAS = 60;
const DIAS = 7;

const PRODUCTOS = [
  { nombre: 'Espresso', precio: 2200 },
  { nombre: 'Americano', precio: 2500 },
  { nombre: 'Cappuccino', precio: 3200 },
  { nombre: 'Latte', precio: 3500 },
  { nombre: 'Mocaccino', precio: 3800 },
  { nombre: 'Té chai', precio: 3000 },
  { nombre: 'Croissant', precio: 2800 },
  { nombre: 'Brownie', precio: 2400 },
  { nombre: 'Sándwich de pavo', precio: 4900 },
  { nombre: 'Cheesecake', precio: 3900 },
];

// Clientes falsos que se repiten. "correoEscrito" es cómo lo escribe a veces el sistema de caja.
const CONTACTOS = [
  { correo: 'ana.perez@ejemplo.cl', correoEscrito: ' Ana.Perez@Ejemplo.cl', fono: '9 1111 1111' },
  { correo: 'bruno.soto@ejemplo.cl', correoEscrito: 'Bruno.Soto@ejemplo.cl ', fono: '9 1111 3333' },
  { correo: 'carla.diaz@ejemplo.cl', correoEscrito: ' carla.diaz@ejemplo.cl', fono: '9 2222 2222' },
  { correo: 'diego.rojas@ejemplo.cl', correoEscrito: 'DIEGO.ROJAS@ejemplo.cl', fono: '9 3333 3333' },
  { correo: 'elena.mora@ejemplo.cl', correoEscrito: 'Elena.Mora@Ejemplo.cl', fono: '9 4444 4444' },
];

// Generador pseudoaleatorio mulberry32: con la misma semilla sale siempre igual.
function crearAzar(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Formato chileno: el punto separa miles, por ejemplo $4.500.
function formatoPesos(monto: number): string {
  return '$' + String(monto).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const azar = crearAzar(SEMILLA);
const elegir = <T>(lista: T[]): T => lista[Math.floor(azar() * lista.length)];

type Venta = {
  fecha: Date;
  producto: string;
  cantidad: number;
  total: number;
  contacto: (typeof CONTACTOS)[number] | null;
  modoContacto: 'ninguno' | 'correo' | 'fono' | 'ambos';
};

const ventas: Venta[] = [];
for (let i = 0; i < TOTAL_VENTAS; i++) {
  const dia = Math.floor(azar() * DIAS);
  const hora = 8 + Math.floor(azar() * 11); // 08:00 a 18:59
  const minuto = Math.floor(azar() * 60);
  const producto = elegir(PRODUCTOS);
  const cantidad = 1 + Math.floor(azar() * 3);

  // Cerca de 60 % de las ventas no tiene contacto; el resto alterna el modo.
  const tieneContacto = azar() >= 0.6;
  const modos: Venta['modoContacto'][] = ['correo', 'fono', 'ambos'];
  ventas.push({
    fecha: new Date(Date.UTC(2026, 9, 27 + dia, hora, minuto)),
    producto: producto.nombre,
    cantidad,
    total: producto.precio * cantidad,
    contacto: tieneContacto ? elegir(CONTACTOS) : null,
    modoContacto: tieneContacto ? modos[i % modos.length] : 'ninguno',
  });
}
ventas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

const libro = new ExcelJS.Workbook();
const hoja = libro.addWorksheet('Ventas');
hoja.addRow(['N° Boleta', 'Fecha', 'Producto', 'Cant.', 'Total', 'Email cliente', 'Fono']);

let boleta = 0;
ventas.forEach((venta, indice) => {
  boleta++;
  // La mitad de los totales va como texto con formato chileno y la otra mitad como número.
  const total = indice % 2 === 0 ? formatoPesos(venta.total) : venta.total;
  const contacto = venta.contacto;
  // Algunos correos vienen con mayúsculas o espacios, otros ya normalizados.
  const correo =
    contacto && (venta.modoContacto === 'correo' || venta.modoContacto === 'ambos')
      ? indice % 2 === 0
        ? contacto.correoEscrito
        : contacto.correo
      : null;
  const fono = contacto && (venta.modoContacto === 'fono' || venta.modoContacto === 'ambos') ? contacto.fono : null;
  hoja.addRow([`B-${String(boleta).padStart(4, '0')}`, venta.fecha, venta.producto, venta.cantidad, total, correo, fono]);
});

// Dos filas con errores a propósito, para que la demo muestre errores.
boleta++;
hoja.addRow([`B-${String(boleta).padStart(4, '0')}`, 'ayer', 'Latte', 1, 3500, null, null]);
boleta++;
hoja.addRow([`B-${String(boleta).padStart(4, '0')}`, new Date(Date.UTC(2026, 10, 2, 12, 0)), 'Espresso', 1, 'gratis', null, null]);

const ruta = fileURLToPath(new URL('../../../docs/ejemplo-ventas.xlsx', import.meta.url));
await libro.xlsx.writeFile(ruta);
console.log(`Excel de ejemplo generado en ${ruta}`);
