"use server";

import type { MensajeResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import type { EstadoAccion } from "@/components/ui";

// La API responde siempre lo mismo, exista o no el contacto, y manda el enlace de la tarjeta por correo.
// Por eso aquí no hay redirección: ver la tarjeta de alguien con solo saber su correo o teléfono sería una fuga.
export async function consultarSocio(_anterior: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const contacto = String(datos.get("contacto") ?? "").trim();
  if (!contacto) {
    return { ok: false, mensaje: "Ingresa tu número de teléfono o correo." };
  }

  try {
    const respuesta = await apiPost<MensajeResponse>("/clientes/consultar-socio", { contacto }, { publica: true });
    return { ok: true, mensaje: respuesta.mensaje };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
}
