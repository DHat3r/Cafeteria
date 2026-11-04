"use server";

import type { EncabezadosExcel, ResumenImportacion } from "@cafeteria/shared";
import { apiSubir, mensajeParaUsuario } from "@/lib/api";

// La API procesa el archivo en memoria, así que se valida antes de enviarlo.
const TAMANO_MAXIMO = 5 * 1024 * 1024;

// Devuelve el motivo por el que el archivo no sirve, o null si está bien.
function errorDeArchivo(archivo: File): string | null {
  if (archivo.size === 0) return "El archivo está vacío.";
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) return "El archivo debe ser .xlsx.";
  if (archivo.size > TAMANO_MAXIMO) return "El archivo supera el máximo de 5 MB.";
  return null;
}

export async function leerEncabezados(
  datos: FormData,
): Promise<{ ok: true; encabezados: EncabezadosExcel } | { ok: false; mensaje: string }> {
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File)) return { ok: false, mensaje: "Elige un archivo .xlsx." };

  const error = errorDeArchivo(archivo);
  if (error) return { ok: false, mensaje: error };

  const formData = new FormData();
  formData.append("archivo", archivo);

  try {
    const encabezados = await apiSubir<EncabezadosExcel>("/importaciones/encabezados", formData);
    return { ok: true, encabezados };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}

export async function importarVentas(
  datos: FormData,
): Promise<{ ok: true; resumen: ResumenImportacion } | { ok: false; mensaje: string }> {
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File)) return { ok: false, mensaje: "Elige un archivo .xlsx." };

  const error = errorDeArchivo(archivo);
  if (error) return { ok: false, mensaje: error };

  const formData = new FormData();
  formData.append("archivo", archivo);
  formData.append("mapeo", String(datos.get("mapeo") ?? ""));

  try {
    const resumen = await apiSubir<ResumenImportacion>("/importaciones", formData);
    return { ok: true, resumen };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}
