"use server";

import { redirect } from "next/navigation";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import type { EstadoAccion } from "@/components/ui";

export async function consultarSocio(_anterior: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const contacto = String(datos.get("contacto") ?? "").trim();
  if (!contacto) {
    return { ok: false, mensaje: "Ingresa tu número de teléfono o correo." };
  }

  let tokenDestino: string | null = null;
  try {
    const respuesta = await apiPost<{ token?: string; mensaje?: string }>(
      "/clientes/consultar-socio",
      { contacto },
      { publica: true }
    );
    if (respuesta.token) {
      tokenDestino = respuesta.token;
    } else {
      return { ok: false, mensaje: respuesta.mensaje ?? "No encontramos registros con este contacto." };
    }
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }

  if (tokenDestino) {
    redirect(`/socio/${tokenDestino}`);
  }
  return null;
}
