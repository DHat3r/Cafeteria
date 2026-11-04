"use client";

import { useActionState } from "react";
import { Boton, Campo, Mensaje } from "@/components/ui";
import { registrarCliente, type EstadoRegistro } from "./acciones";

export function FormularioRegistro() {
  const [estado, accion, pendiente] = useActionState<EstadoRegistro, FormData>(registrarCliente, null);

  // Tras un registro exitoso no se vuelve a mostrar el formulario.
  if (estado?.ok) {
    return <Mensaje ok={true}>{estado.mensaje}</Mensaje>;
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        name="nombre"
        required
        maxLength={80}
        autoComplete="name"
        defaultValue={estado?.valores?.nombre}
      />
      <Campo
        etiqueta="Correo"
        name="correo"
        type="email"
        autoComplete="email"
        defaultValue={estado?.valores?.correo}
      />
      <Campo
        etiqueta="Teléfono"
        name="telefono"
        type="tel"
        autoComplete="tel"
        defaultValue={estado?.valores?.telefono}
        ayuda="Móvil chileno, por ejemplo 9 1234 5678"
      />
      <p className="text-xs text-zinc-500">Indica al menos un correo o un teléfono.</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consentimiento" required className="mt-1" />
        <span>
          Acepto recibir ofertas por correo y que mis datos se usen solo para eso. Puedo darme de baja cuando quiera.
        </span>
      </label>
      {estado && <Mensaje ok={estado.ok}>{estado.mensaje}</Mensaje>}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Enviando…" : "Quiero recibir ofertas"}
      </Boton>
    </form>
  );
}
