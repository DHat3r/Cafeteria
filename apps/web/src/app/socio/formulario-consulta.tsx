"use client";

import { useActionState } from "react";
import { Boton, Campo, Mensaje } from "@/components/ui";
import { consultarSocio } from "./acciones";

export function FormularioConsultaSocio() {
  const [estado, accion, pendiente] = useActionState(consultarSocio, null);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="Teléfono o Correo"
        name="contacto"
        type="text"
        required
        placeholder="Ej: 9 1234 5678 o nombre@correo.cl"
        ayuda="El número de teléfono o correo con el que te registraste en la cafetería."
      />
      {estado && <Mensaje ok={estado.ok}>{estado.mensaje}</Mensaje>}
      <Boton type="submit" disabled={pendiente}>
        {pendiente ? "Buscando…" : "Ver mi tarjeta y puntos"}
      </Boton>
    </form>
  );
}
