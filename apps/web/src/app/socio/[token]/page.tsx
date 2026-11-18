import Link from "next/link";
import { notFound } from "next/navigation";
import type { SocioPerfilResponse } from "@cafeteria/shared";
import { PESOS_POR_PUNTO } from "@cafeteria/shared";
import { GranoCafe, Tarjeta, pesos } from "@/components/ui";
import { apiGet } from "@/lib/api";

export const metadata = { title: "Mi Tarjeta de Fidelización | Cafetería" };

function formatoMoneda(valor: number): string {
  return `$${valor.toLocaleString("es-CL")}`;
}

function formatoFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function PaginaSocio({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let socio: SocioPerfilResponse;
  try {
    socio = await apiGet<SocioPerfilResponse>(`/clientes/socio/${token}`, { publica: true });
  } catch {
    notFound();
  }

  const progresoRecompensa = socio.puntos % socio.proximaRecompensaPuntos;
  const faltan = socio.proximaRecompensaPuntos - progresoRecompensa;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-8 sm:py-12">
      {/* Tarjeta Digital de Socio */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f3322] via-[#273d2a] to-[#3e2e25] p-6 text-white shadow-2xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-abril.png"
              alt="Abril 1781"
              className="size-11 rounded-full object-cover shadow-sm border-2 border-white/25"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white">Abril · 1781</span>
              <span className="text-[10px] uppercase tracking-widest text-[#f6f3eb]/75">Club de Fidelización</span>
            </div>
          </div>
          <span className="rounded-full bg-[#d46979] px-3 py-1 text-xs font-semibold text-white shadow-xs">
            Socio Activo
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-white/70">Socio Club</span>
          <h1 className="text-2xl font-bold tracking-tight text-white">{socio.nombre}</h1>
        </div>

        <div className="mt-5 rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-sm">
          <span className="text-xs font-medium text-white/80">Tu identificador en caja:</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xl font-bold tracking-wider sm:text-2xl text-[#f6f3eb]">{socio.identificador}</span>
            <span className="text-xs text-white/75">Dicta este número al pagar</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-center">
          <div>
            <span className="text-xs text-white/75">Puntos acumulados</span>
            <p className="text-3xl font-extrabold">{socio.puntos}</p>
          </div>
          <div>
            <span className="text-xs text-white/75">Visitas registradas</span>
            <p className="text-3xl font-extrabold">{socio.totalCompras}</p>
          </div>
        </div>
      </section>

      {/* Próxima Recompensa */}
      <Tarjeta titulo="Progreso de Recompensas">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-tinta">Café o descuento especial</span>
            <span className="text-tinta-suave">
              {progresoRecompensa} de {socio.proximaRecompensaPuntos} sellos
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-linea">
            <div
              className="h-full rounded-full bg-cereza transition-all duration-500"
              style={{ width: `${Math.min(100, (progresoRecompensa / socio.proximaRecompensaPuntos) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-tinta-suave">
            {faltan === 0 || socio.puntos >= socio.proximaRecompensaPuntos
              ? "¡Tienes recompensas disponibles para canjear en tu próxima visita!"
              : `Te faltan ${faltan} puntos (${faltan} compras de ${pesos(PESOS_POR_PUNTO)}) para tu próxima recompensa.`}
          </p>
        </div>
      </Tarjeta>

      {/* Ofertas y Promociones Activas */}
      <Tarjeta titulo="Tus Ofertas y Beneficios">
        {socio.ofertas.length === 0 ? (
          <p className="text-sm text-tinta-suave">
            No hay ofertas vigentes en este momento. Te avisaremos a tu correo cada vez que tengamos promociones especiales para ti.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {socio.ofertas.map((oferta) => (
              <div key={oferta.id} className="rounded-xl border border-linea bg-superficie-2 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-cereza">Promoción</span>
                <h3 className="mt-1 font-semibold text-tinta">{oferta.asunto}</h3>
                <p className="mt-1 text-sm text-tinta-suave">{oferta.mensaje}</p>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {/* Historial de Compras */}
      <Tarjeta titulo="Tus Últimas Visitas">
        {socio.ultimasCompras.length === 0 ? (
          <p className="text-sm text-tinta-suave">
            Aún no tienes compras asociadas. En tu próxima visita, dicta tu número al cajero para sumar puntos.
          </p>
        ) : (
          <ul className="divide-y divide-linea text-sm">
            {socio.ultimasCompras.map((compra, index) => (
              <li key={index} className="flex items-center justify-between py-2.5">
                <div className="flex flex-col">
                  <span className="font-medium text-tinta">{compra.producto}</span>
                  <span className="text-xs text-tinta-suave">{formatoFecha(compra.fecha)}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-tinta">{formatoMoneda(compra.monto)}</span>
                  {compra.cantidad > 1 && (
                    <span className="block text-xs text-tinta-suave">{compra.cantidad} unidades</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <footer className="text-center text-xs text-tinta-suave">
        ¿Quieres dejar de recibir ofertas?{" "}
        <Link href={`/baja/${socio.tokenBaja}`} className="underline hover:text-cereza">
          Darte de baja
        </Link>
      </footer>
    </main>
  );
}
