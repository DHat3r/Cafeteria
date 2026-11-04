import "server-only";
import { redirect, unstable_rethrow } from "next/navigation";
import { obtenerToken } from "./sesion";

// Cliente de la API para el servidor de Next (Server Components y Server Actions).
// Nunca se importa desde un componente de cliente: así el token y la URL interna
// de la API (API_URL) no llegan al navegador.
const apiUrl = process.env.API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly estado: number,
  ) {
    super(message);
  }
}

type Opciones = {
  // Las rutas públicas (registro, baja, login) no llevan token ni redirigen al login.
  publica?: boolean;
};

async function llamar<T>(ruta: string, init: RequestInit, { publica = false }: Opciones): Promise<T> {
  const headers = new Headers(init.headers);
  if (!publica) {
    const token = await obtenerToken();
    if (!token) redirect("/login");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const respuesta = await fetch(`${apiUrl}/api${ruta}`, { ...init, headers, cache: "no-store" });

  // Sesión vencida o token inválido: se vuelve al login.
  if (!publica && respuesta.status === 401) redirect("/login?expirada=1");
  if (!respuesta.ok) throw new ApiError(await mensajeDeError(respuesta), respuesta.status);
  return (await respuesta.json()) as T;
}

// Nest responde { message: string | string[] }; si el servidor no responde JSON, texto genérico.
async function mensajeDeError(respuesta: Response): Promise<string> {
  try {
    const { message } = (await respuesta.json()) as { message?: string | string[] };
    if (Array.isArray(message)) return message.join(". ");
    if (message) return message;
  } catch {
    // La respuesta no era JSON.
  }
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

export function apiGet<T>(ruta: string): Promise<T> {
  return llamar<T>(ruta, {}, {});
}

export function apiPost<T>(ruta: string, cuerpo: unknown, opciones: Opciones = {}): Promise<T> {
  return llamar<T>(
    ruta,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) },
    opciones,
  );
}

// Para subir archivos: el navegador/fetch arma el Content-Type multipart con su boundary.
export function apiSubir<T>(ruta: string, datos: FormData): Promise<T> {
  return llamar<T>(ruta, { method: "POST", body: datos }, {});
}

// Mensaje seguro para mostrar en pantalla a partir de cualquier error.
export function mensajeParaUsuario(error: unknown): string {
  // redirect() y notFound() funcionan lanzando una excepción especial; hay que dejarla pasar.
  unstable_rethrow(error);
  if (error instanceof ApiError) return error.message;
  return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
}
