import Link from "next/link";
import { TarjetaFidelidad } from "@/components/ui";
import { FormularioConsultaSocio } from "./formulario-consulta";

export const metadata = { title: "Consultar Tarjeta de Socio | Cafetería" };

export default function PaginaBuscarSocio() {
  return (
    <TarjetaFidelidad
      titulo="Club Cafetería"
      bajada="Consulta tus puntos acumulados, tu identificador para mostrar en caja y tus ofertas vigentes."
    >
      <FormularioConsultaSocio />
      <div className="mt-4 border-t border-linea pt-4 text-center text-xs text-tinta-suave">
        ¿Aún no estás registrado?{" "}
        <Link href="/registro" className="font-semibold text-cereza underline hover:text-cereza-hover">
          Únete al club aquí
        </Link>
      </div>
    </TarjetaFidelidad>
  );
}
