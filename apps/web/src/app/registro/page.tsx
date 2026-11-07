import { TarjetaFidelidad } from "@/components/ui";
import { FormularioRegistro } from "./formulario";

export const metadata = { title: "Recibe ofertas | Cafetería" };

// Página pública: el cliente la abre desde el QR en su celular, así que no exige sesión.
export default function PaginaRegistro() {
  return (
    <TarjetaFidelidad
      titulo="Recibe nuestras ofertas"
      bajada="Regístrate y te enviaremos promociones pensadas para ti."
    >
      <FormularioRegistro />
    </TarjetaFidelidad>
  );
}
