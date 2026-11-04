"use server";

import type { MensajeResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import type { EstadoAccion } from "@/components/ui";

// Si el registro falla, se devuelve lo que escribió el cliente: React 19 vacía los campos
// de un formulario después de enviarlo y así no tiene que volver a escribirlo todo.
export type EstadoRegistro =
  | (NonNullable<EstadoAccion> & { valores?: { nombre: string; correo: string; telefono: string } })
  | null;

export async function registrarCliente(_anterior: EstadoRegistro, datos: FormData): Promise<EstadoRegistro> {
  const nombre = String(datos.get("nombre") ?? "").trim();
  const correo = String(datos.get("correo") ?? "").trim();
  const telefono = String(datos.get("telefono") ?? "").trim();
  // El checkbox llega como "on" cuando está marcado y no llega si no lo está.
  const consentimiento = datos.get("consentimiento") === "on";

  try {
    const respuesta = await apiPost<MensajeResponse>(
      "/clientes/registro",
      { nombre, correo: correo || undefined, telefono: telefono || undefined, consentimiento },
      { publica: true },
    );
    return { ok: true, mensaje: respuesta.mensaje };
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error), valores: { nombre, correo, telefono } };
  }
}
