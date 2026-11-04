"use client";

import { useActionState } from "react";
import { Boton, Campo, Mensaje } from "@/components/ui";
import { iniciarSesion, type EstadoLogin } from "./acciones";

export function FormularioLogin({ expirada }: { expirada: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, null);

  return (
    <form action={accion} className="flex flex-col gap-4">
      {expirada && !estado && <Mensaje ok={false}>Tu sesión venció. Ingresa de nuevo.</Mensaje>}
      <Campo
        etiqueta="Correo"
        name="email"
        type="email"
        autoComplete="username"
        required
        defaultValue={estado?.valores?.email}
      />
      <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" required />
      {estado && <Mensaje ok={estado.ok}>{estado.mensaje}</Mensaje>}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Ingresando…" : "Ingresar"}
      </Boton>
    </form>
  );
}
