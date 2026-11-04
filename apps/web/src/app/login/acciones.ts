"use server";

import { redirect } from "next/navigation";
import type { LoginResponse } from "@cafeteria/shared";
import { apiPost, mensajeParaUsuario } from "@/lib/api";
import { borrarToken, guardarToken } from "@/lib/sesion";
import type { EstadoAccion } from "@/components/ui";

export async function iniciarSesion(_anterior: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const email = String(datos.get("email") ?? "");
  const password = String(datos.get("password") ?? "");

  try {
    const { token } = await apiPost<LoginResponse>("/auth/login", { email, password }, { publica: true });
    await guardarToken(token);
  } catch (error) {
    return { ok: false, mensaje: mensajeParaUsuario(error) };
  }
  // redirect() lanza una excepción especial, por eso va fuera del try/catch.
  redirect("/panel");
}

export async function cerrarSesion(): Promise<void> {
  await borrarToken();
  redirect("/login");
}
