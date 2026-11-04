"use client";

import { useActionState } from "react";
import { Boton, Mensaje } from "@/components/ui";
import { darDeBaja } from "./acciones";

// Darse de baja es un POST tras un clic y no un enlace directo: así los antivirus de correo
// que abren los enlaces automáticamente no dan de baja a nadie sin querer.
export function FormularioBaja({ token }: { token: string }) {
  const [estado, accion, pendiente] = useActionState(darDeBaja, null);

  if (estado?.ok) {
    return <Mensaje ok={true}>{estado.mensaje}</Mensaje>;
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {estado && <Mensaje ok={estado.ok}>{estado.mensaje}</Mensaje>}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Confirmando…" : "Confirmar baja"}
      </Boton>
    </form>
  );
}
