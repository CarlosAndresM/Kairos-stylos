import { Metadata } from "next";
import { getDynamicClients } from "@/features/billing/client-services";
import { ClientClient } from "./client-component";

import { getCurrentUserSession } from "@/features/dashboard/services";

export const metadata: Metadata = {
  title: "Clientes | Kyroy Stilos",
  description: "Listado dinámico de clientes",
};

export default async function ClientesPage() {
  const sessionRes = await getCurrentUserSession();
  const sessionUser = sessionRes.success ? sessionRes.data : null;
  const sucursalId = sessionUser?.role === 'ADMINISTRADOR_TOTAL' ? undefined : sessionUser?.branchId;

  const res = await getDynamicClients(sucursalId);
  const clients = res.success ? (res.data as any[]) : [];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">
          Directorio de Clientes
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase italic">
          Historial dinámico de clientes generado desde facturación.
        </p>
      </div>

      <ClientClient initialClients={clients} />
    </div>
  );
}
