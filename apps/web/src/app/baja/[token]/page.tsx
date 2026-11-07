import { TarjetaFidelidad } from "@/components/ui";
import { FormularioBaja } from "./formulario";

export const metadata = { title: "Darse de baja | Cafetería" };

export default async function PaginaBaja({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <TarjetaFidelidad
      titulo="Dejar de recibir ofertas"
      bajada="Si confirmas, no volverás a recibir ofertas por correo."
    >
      <FormularioBaja token={token} />
    </TarjetaFidelidad>
  );
}
