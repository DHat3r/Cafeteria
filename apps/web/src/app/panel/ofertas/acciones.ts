"use server";

import type { CrearOfertaRequest, OfertaResumen, Segmento, VistaPreviaResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";

export async function contarDestinatarios(
  segmento: Segmento,
): Promise<{ ok: true; destinatarios: number } | { ok: false; mensaje: string }> {
  try {
    const { destinatarios } = await apiPost<VistaPreviaResponse>("/ofertas/vista-previa", { segmento });
    return { ok: true, destinatarios };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}

export async function enviarOferta(
  peticion: CrearOfertaRequest,
): Promise<{ ok: true; oferta: OfertaResumen } | { ok: false; mensaje: string }> {
  try {
    const oferta = await apiPost<OfertaResumen>("/ofertas", peticion);
    return { ok: true, oferta };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}
