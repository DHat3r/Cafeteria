"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { EncabezadosExcel, ResumenImportacion } from "@cafeteria/shared";
import { Boton, Mensaje } from "@/components/ui";
import { importarVentas, leerEncabezados } from "./acciones";
import { CAMPOS, construirMapeo, seleccionInicial } from "./columnas";
import type { Campo, Seleccion } from "./columnas";

type Paso = "archivo" | "columnas" | "resultado";

const estiloCampo =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function Importador() {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [paso, setPaso] = useState<Paso>("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<EncabezadosExcel | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function leer(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivo) return;

    const datos = new FormData();
    datos.append("archivo", archivo);

    empezar(async () => {
      setMensaje(null);
      const resultado = await leerEncabezados(datos);
      if (!resultado.ok) {
        setMensaje(resultado.mensaje);
        return;
      }
      setEncabezados(resultado.encabezados);
      setSeleccion(seleccionInicial(resultado.encabezados));
      setPaso("columnas");
    });
  }

  function cambiarColumna(clave: Campo, columna: string) {
    setSeleccion((anterior) => (anterior ? { ...anterior, [clave]: columna } : anterior));
  }

  function volver() {
    setPaso("archivo");
    setArchivo(null);
    setMensaje(null);
  }

  function importar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!archivo || !seleccion) return;

    const datos = new FormData();
    datos.append("archivo", archivo);
    datos.append("mapeo", JSON.stringify(construirMapeo(seleccion)));

    empezar(async () => {
      setMensaje(null);
      const resultado = await importarVentas(datos);
      if (!resultado.ok) {
        setMensaje(resultado.mensaje);
        return;
      }
      setResumen(resultado.resumen);
      setPaso("resultado");
      // Actualiza el historial de importaciones de la página.
      router.refresh();
    });
  }

  function reiniciar() {
    setPaso("archivo");
    setArchivo(null);
    setEncabezados(null);
    setSeleccion(null);
    setResumen(null);
    setMensaje(null);
  }

  if (paso === "resultado" && resumen) {
    const cifras = [
      { etiqueta: "Filas leídas", valor: resumen.filasLeidas },
      { etiqueta: "Importadas", valor: resumen.importadas },
      { etiqueta: "Duplicadas", valor: resumen.duplicadas },
      { etiqueta: "Con error", valor: resumen.conError },
      { etiqueta: "Asociadas a un cliente", valor: resumen.asociadas },
    ];

    return (
      <div className="flex flex-col gap-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {cifras.map(({ etiqueta, valor }) => (
            <div key={etiqueta}>
              <dt className="text-sm text-zinc-500">{etiqueta}</dt>
              <dd className="text-2xl font-semibold">{valor}</dd>
            </div>
          ))}
        </dl>

        {resumen.errores && resumen.errores.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-medium">Filas con error</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-3 py-2 font-medium">Fila</th>
                    <th className="px-3 py-2 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.errores.map((error) => (
                    <tr key={error.fila} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2">{error.fila}</td>
                      <td className="px-3 py-2">{error.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500">Mostramos hasta 50 errores.</p>
          </div>
        )}

        <div>
          <Boton type="button" onClick={reiniciar}>
            Importar otro archivo
          </Boton>
        </div>
      </div>
    );
  }

  if (paso === "columnas" && encabezados && seleccion) {
    return (
      <form onSubmit={importar} className="flex flex-col gap-6">
        <div>
          <h3 className="mb-2 font-medium">Primeras filas del archivo</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {encabezados.encabezados.map((encabezado, indice) => (
                    <th key={indice} className="px-3 py-2 font-medium">
                      {encabezado}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encabezados.muestra.map((fila, indice) => (
                  <tr key={indice} className="border-b border-zinc-100 dark:border-zinc-800">
                    {encabezados.encabezados.map((encabezado, columna) => (
                      <td key={columna} className="px-3 py-2">
                        {fila[encabezado]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(({ clave, etiqueta, obligatorio }) => (
            <label key={clave} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{etiqueta}</span>
              <select
                value={seleccion[clave]}
                onChange={(evento) => cambiarColumna(clave, evento.target.value)}
                disabled={pendiente}
                className={estiloCampo}
              >
                {!obligatorio && <option value="">(ninguna)</option>}
                {encabezados.encabezados.map((encabezado, indice) => (
                  <option key={indice} value={encabezado}>
                    {encabezado}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Si el archivo no trae N° de boleta, evitamos duplicados comparando el contenido de cada fila.
        </p>

        {mensaje && <Mensaje ok={false}>{mensaje}</Mensaje>}

        <div className="flex gap-3">
          <Boton type="button" onClick={volver} disabled={pendiente} className="bg-zinc-700 hover:bg-zinc-800">
            Volver
          </Boton>
          <Boton type="submit" disabled={pendiente}>
            {pendiente ? "Importando…" : "Importar ventas"}
          </Boton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={leer} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Archivo de ventas (.xlsx)</span>
        <input
          type="file"
          accept=".xlsx"
          required
          disabled={pendiente}
          onChange={(evento) => setArchivo(evento.target.files?.[0] ?? null)}
          className={estiloCampo}
        />
      </label>
      {mensaje && <Mensaje ok={false}>{mensaje}</Mensaje>}
      <div>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Leyendo…" : "Leer columnas"}
        </Boton>
      </div>
    </form>
  );
}
