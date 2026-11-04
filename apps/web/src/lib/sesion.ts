import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESION } from "./sesion-nombre";

// El token JWT del admin vive en una cookie httpOnly: el JavaScript del navegador
// no puede leerla, así que un fallo de XSS no permite robar la sesión.
const OCHO_HORAS = 8 * 60 * 60;

export async function obtenerToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESION)?.value;
}

export async function guardarToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    // En local y en Docker se usa http; en producción con HTTPS: COOKIE_SECURE=true.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: OCHO_HORAS,
  });
}

export async function borrarToken(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}
