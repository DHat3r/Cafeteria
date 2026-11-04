import { describe, expect, it } from "vitest";
import type { EncabezadosExcel } from "@cafeteria/shared";
import { adivinarColumnas, construirMapeo, seleccionInicial } from "./columnas";

describe("adivinarColumnas", () => {
  it("adivina las columnas de los encabezados reales del Excel de ejemplo", () => {
    const encabezados = ["N° Boleta", "Fecha", "Producto", "Cant.", "Total", "Email cliente", "Fono"];

    expect(adivinarColumnas(encabezados)).toEqual({
      fecha: "Fecha",
      producto: "Producto",
      monto: "Total",
      cantidad: "Cant.",
      correo: "Email cliente",
      telefono: "Fono",
      idExterno: "N° Boleta",
    });
  });

  it("ignora mayúsculas y tildes al reconocer los encabezados", () => {
    const encabezados = [
      "FECHA DE VENTA",
      "Descripción",
      "Valor",
      "Cantidad",
      "Correo electrónico",
      "Celular",
      "Folio",
    ];

    const seleccion = adivinarColumnas(encabezados);

    expect(seleccion.fecha).toBe("FECHA DE VENTA");
    expect(seleccion.producto).toBe("Descripción");
    expect(seleccion.monto).toBe("Valor");
    expect(seleccion.cantidad).toBe("Cantidad");
    expect(seleccion.correo).toBe("Correo electrónico");
    expect(seleccion.telefono).toBe("Celular");
    expect(seleccion.idExterno).toBe("Folio");
  });

  it("usa cada encabezado una sola vez", () => {
    const seleccion = adivinarColumnas(["Total venta", "Fecha", "Producto"]);

    expect(seleccion.monto).toBe("Total venta");
    expect(seleccion.idExterno).toBe("");
  });

  it("usa el primer encabezado para los obligatorios que no se adivinan", () => {
    const seleccion = adivinarColumnas(["A", "B", "C"]);

    expect(seleccion.fecha).toBe("A");
    expect(seleccion.producto).toBe("A");
    expect(seleccion.monto).toBe("A");
    expect(seleccion.cantidad).toBe("");
    expect(seleccion.correo).toBe("");
    expect(seleccion.telefono).toBe("");
    expect(seleccion.idExterno).toBe("");
  });

  it("deja los obligatorios vacíos cuando no hay encabezados", () => {
    const seleccion = adivinarColumnas([]);

    expect(seleccion.fecha).toBe("");
    expect(seleccion.producto).toBe("");
    expect(seleccion.monto).toBe("");
  });
});

describe("seleccionInicial", () => {
  const encabezadosDelArchivo = ["Fecha", "Producto", "Total"];

  it("usa el mapeo guardado cuando todas sus columnas existen en el archivo", () => {
    const archivo: EncabezadosExcel = {
      encabezados: encabezadosDelArchivo,
      muestra: [],
      mapeoGuardado: { fecha: "Fecha", producto: "Producto", monto: "Total" },
    };

    const seleccion = seleccionInicial(archivo);

    expect(seleccion).toEqual({
      fecha: "Fecha",
      producto: "Producto",
      monto: "Total",
      cantidad: "",
      correo: "",
      telefono: "",
      idExterno: "",
    });
  });

  it("ignora el mapeo guardado si una de sus columnas ya no existe y adivina por nombre", () => {
    const archivo: EncabezadosExcel = {
      encabezados: encabezadosDelArchivo,
      muestra: [],
      mapeoGuardado: { fecha: "Fecha", producto: "Producto", monto: "Monto antiguo" },
    };

    const seleccion = seleccionInicial(archivo);

    expect(seleccion.monto).toBe("Total");
    expect(seleccion).toEqual(adivinarColumnas(encabezadosDelArchivo));
  });

  it("adivina por nombre cuando no hay mapeo guardado", () => {
    const archivo: EncabezadosExcel = {
      encabezados: encabezadosDelArchivo,
      muestra: [],
      mapeoGuardado: null,
    };

    expect(seleccionInicial(archivo)).toEqual(adivinarColumnas(encabezadosDelArchivo));
  });
});

describe("construirMapeo", () => {
  it("incluye siempre fecha, producto y monto, y omite las opcionales vacías", () => {
    const mapeo = construirMapeo({
      fecha: "Fecha",
      producto: "Producto",
      monto: "Total",
      cantidad: "",
      correo: "",
      telefono: "",
      idExterno: "",
    });

    expect(mapeo).toEqual({ fecha: "Fecha", producto: "Producto", monto: "Total" });
    expect(Object.keys(mapeo)).toEqual(["fecha", "producto", "monto"]);
    expect(Object.keys(mapeo)).not.toContain("cantidad");
    expect(Object.keys(mapeo)).not.toContain("correo");
    expect(Object.keys(mapeo)).not.toContain("telefono");
    expect(Object.keys(mapeo)).not.toContain("idExterno");
  });
});
