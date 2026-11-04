import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/sesion-nombre";

// Primera barrera: sin cookie de sesión, /panel redirige al login antes de renderizar.
// No valida el token (eso lo hace la API en cada llamada); el layout del panel
// también revisa, porque el proxy no debe ser la única defensa.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(COOKIE_SESION)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/panel/:path*",
};
