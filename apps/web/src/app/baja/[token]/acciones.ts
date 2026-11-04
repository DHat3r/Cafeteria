"use server";

import type { MensajeResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import type { EstadoAccion } from "@/components/ui";

export async function darDeBaja(_anterior: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const token = String(datos.get("token") ?? "");

  try {
    const respuesta = await apiPost<MensajeResponse>(
      `/clientes/baja/${encodeURIComponent(token)}`,
      {},
      { publica: true },
    );
    return { ok: true, mensaje: respuesta.mensaje };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}
