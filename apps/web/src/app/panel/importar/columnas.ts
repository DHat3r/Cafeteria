import type { EncabezadosExcel, MapeoColumnas } from "@cafeteria/shared";

export type Campo = keyof MapeoColumnas;
export type Seleccion = Record<Campo, string>;

export const CAMPOS: { clave: Campo; etiqueta: string; obligatorio: boolean }[] = [
  { clave: "fecha", etiqueta: "Fecha*", obligatorio: true },
  { clave: "producto", etiqueta: "Producto*", obligatorio: true },
  { clave: "monto", etiqueta: "Monto*", obligatorio: true },
  { clave: "cantidad", etiqueta: "Cantidad", obligatorio: false },
  { clave: "correo", etiqueta: "Correo del cliente", obligatorio: false },
  { clave: "telefono", etiqueta: "Teléfono del cliente", obligatorio: false },
  { clave: "idExterno", etiqueta: "N° de boleta", obligatorio: false },
];

// Palabras (en minúsculas y sin tildes) que delatan cada columna en el nombre del encabezado.
export const PISTAS: Record<Campo, string[]> = {
  fecha: ["fecha"],
  producto: ["producto", "item", "articulo", "descripcion"],
  monto: ["total", "monto", "precio", "valor"],
  cantidad: ["cant"],
  correo: ["mail", "correo"],
  telefono: ["fono", "tel", "celular", "movil"],
  idExterno: ["boleta", "folio", "venta", "id"],
};

function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Adivina la columna de cada campo por el nombre del encabezado. Cada encabezado se usa una sola vez.
export function adivinarColumnas(encabezados: string[]): Seleccion {
  const usados = new Set<string>();
  const seleccion = {} as Seleccion;

  for (const { clave, obligatorio } of CAMPOS) {
    const encontrado = encabezados.find(
      (encabezado) =>
        !usados.has(encabezado) && PISTAS[clave].some((pista) => sinTildes(encabezado).includes(pista)),
    );
    if (encontrado) usados.add(encontrado);
    // Si un obligatorio no se adivinó, se usa el primer encabezado para que el admin lo corrija.
    seleccion[clave] = encontrado ?? (obligatorio ? (encabezados[0] ?? "") : "");
  }
  return seleccion;
}

// Usa el mapeo guardado solo si todas sus columnas existen en este archivo; si no, adivina.
export function seleccionInicial(encabezados: EncabezadosExcel): Seleccion {
  const guardado = encabezados.mapeoGuardado;

  if (guardado) {
    const columnas = CAMPOS.map(({ clave }) => guardado[clave]).filter(
      (columna): columna is string => columna !== undefined && columna !== "",
    );
    if (columnas.every((columna) => encabezados.encabezados.includes(columna))) {
      const seleccion = {} as Seleccion;
      for (const { clave } of CAMPOS) seleccion[clave] = guardado[clave] ?? "";
      return seleccion;
    }
  }
  return adivinarColumnas(encabezados.encabezados);
}

// Las columnas opcionales vacías no se envían: la API las trata como si no existieran.
export function construirMapeo(seleccion: Seleccion): MapeoColumnas {
  const mapeo: MapeoColumnas = {
    fecha: seleccion.fecha,
    producto: seleccion.producto,
    monto: seleccion.monto,
  };
  if (seleccion.cantidad) mapeo.cantidad = seleccion.cantidad;
  if (seleccion.correo) mapeo.correo = seleccion.correo;
  if (seleccion.telefono) mapeo.telefono = seleccion.telefono;
  if (seleccion.idExterno) mapeo.idExterno = seleccion.idExterno;
  return mapeo;
}
