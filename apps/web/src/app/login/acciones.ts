"use server";

import { redirect } from "next/navigation";
import type { LoginResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import { borrarToken, guardarToken } from "@/lib/sesion";
import type { EstadoAccion } from "@/components/ui";

// Si el login falla se devuelve el correo escrito: React 19 vacía los campos de un formulario
// después de enviarlo. La contraseña no se devuelve nunca: siempre hay que volver a escribirla.
export type EstadoLogin = (NonNullable<EstadoAccion> & { valores?: { email: string } }) | null;

export async function iniciarSesion(_anterior: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const email = String(datos.get("email") ?? "");
  const password = String(datos.get("password") ?? "");

  try {
    const { token } = await apiPost<LoginResponse>("/auth/login", { email, password }, { publica: true });
    await guardarToken(token);
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error), valores: { email } };
  }
  // redirect() lanza una excepción especial, por eso va fuera del try/catch.
  redirect("/panel");
}

export async function cerrarSesion(): Promise<void> {
  await borrarToken();
  redirect("/login");
}
