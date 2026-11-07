"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { Segmento } from "@cafeteria/shared";
import { Boton, Campo, Mensaje, estiloCampo } from "@/components/ui";
import type { EstadoAccion } from "@/components/ui";
import { contarDestinatarios, enviarOferta } from "./acciones";

export function Formulario() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [asunto, setAsunto] = useState("");
  const [texto, setTexto] = useState("");
  const [producto, setProducto] = useState("");
  const [minCompras, setMinCompras] = useState("2");
  const [dias, setDias] = useState("30");
  const [aviso, setAviso] = useState<EstadoAccion>(null);

  // Los números del formulario son texto; Number("") daría 0, que significa "todos los clientes".
  function construirSegmento(): Segmento {
    const segmento: Segmento = { minCompras: Number(minCompras), dias: Number(dias) };
    const productoLimpio = producto.trim();
    if (productoLimpio) segmento.producto = productoLimpio;
    return segmento;
  }

  function verDestinatarios() {
    if (minCompras === "" || dias === "") {
      setAviso({ ok: false, mensaje: "Completa el mínimo de compras y los días." });
      return;
    }

    empezar(async () => {
      setAviso(null);
      const resultado = await contarDestinatarios(construirSegmento());
      if (!resultado.ok) {
        setAviso({ ok: false, mensaje: resultado.mensaje });
        return;
      }
      setAviso({ ok: true, mensaje: `${resultado.destinatarios} cliente(s) recibirían esta oferta` });
    });
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    empezar(async () => {
      setAviso(null);
      const segmento = construirSegmento();

      // Se cuentan antes de enviar para que el admin confirme a cuántos clientes va.
      const conteo = await contarDestinatarios(segmento);
      if (!conteo.ok) {
        setAviso({ ok: false, mensaje: conteo.mensaje });
        return;
      }
      if (conteo.destinatarios === 0) {
        setAviso({ ok: false, mensaje: "Ningún cliente cumple ese segmento; no se envió nada." });
        return;
      }
      if (!window.confirm(`Se enviará a ${conteo.destinatarios} cliente(s). ¿Continuar?`)) return;

      const resultado = await enviarOferta({ asunto, mensaje: texto, segmento });
      if (!resultado.ok) {
        setAviso({ ok: false, mensaje: resultado.mensaje });
        return;
      }
      setAviso({
        ok: true,
        mensaje: `Oferta enviada: ${resultado.oferta.enviados} enviados, ${resultado.oferta.fallidos} fallidos.`,
      });
      setAsunto("");
      setTexto("");
      // Actualiza la lista de ofertas enviadas de la página.
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Campo
          etiqueta="Asunto"
          maxLength={120}
          required
          value={asunto}
          onChange={(evento) => setAsunto(evento.target.value)}
          disabled={pendiente}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Mensaje</span>
          <textarea
            rows={6}
            maxLength={2000}
            required
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            disabled={pendiente}
            className={estiloCampo}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-2xl border border-linea bg-porcelana/50 p-4 sm:grid sm:grid-cols-3 sm:items-start">
        <legend className="px-1 font-semibold">¿A quién se le envía?</legend>
        <Campo
          etiqueta="Producto"
          ayuda="Déjalo vacío para contar cualquier compra"
          value={producto}
          onChange={(evento) => setProducto(evento.target.value)}
          disabled={pendiente}
        />
        <Campo
          etiqueta="Mínimo de compras"
          type="number"
          min={0}
          max={1000}
          required
          ayuda="0 = todos los clientes registrados"
          value={minCompras}
          onChange={(evento) => setMinCompras(evento.target.value)}
          disabled={pendiente}
        />
        <Campo
          etiqueta="En los últimos (días)"
          type="number"
          min={1}
          max={365}
          required
          value={dias}
          onChange={(evento) => setDias(evento.target.value)}
          disabled={pendiente}
        />
      </fieldset>

      {aviso && <Mensaje ok={aviso.ok}>{aviso.mensaje}</Mensaje>}

      <div className="flex flex-wrap gap-3">
        <Boton type="button" onClick={verDestinatarios} disabled={pendiente} variante="secundario">
          Ver cuántos clientes lo recibirían
        </Boton>
        <Boton type="submit" disabled={pendiente}>
          Enviar oferta
        </Boton>
      </div>

      <p className="text-xs text-tinta-suave">
        Cada correo incluye un enlace para darse de baja. Solo reciben ofertas quienes aceptaron al registrarse.
      </p>
    </form>
  );
}
