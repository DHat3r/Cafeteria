"use server";

import { redirect } from "next/navigation";
import type { RegistroClienteResponse } from "@cafeteria/shared";
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

  let respuesta: RegistroClienteResponse;
  try {
    respuesta = await apiPost<RegistroClienteResponse>(
      "/clientes/registro",
      { nombre, correo: correo || undefined, telefono: telefono || undefined, consentimiento },
      { publica: true },
    );
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error), valores: { nombre, correo, telefono } };
  }

  // La API solo entrega el token cuando el cliente se acaba de crear. Si el contacto ya existía no hay token:
  // saber un correo o un teléfono no prueba que sea tuyo, y el enlace a la tarjeta le llega al correo del socio.
  // redirect() lanza una excepción especial de Next, por eso va fuera del try.
  if (respuesta.token) redirect(`/socio/${respuesta.token}`);

  return {
    ok: true,
    mensaje: `${respuesta.mensaje} Si ya estabas registrado, te enviamos a tu correo el enlace a tu tarjeta.`,
  };
}
