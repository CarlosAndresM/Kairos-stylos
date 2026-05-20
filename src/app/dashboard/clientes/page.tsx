import { Metadata } from "next";
import { getDynamicClients } from "@/features/billing/client-services";
import { ClientClient } from "./client-component";

import { getCurrentUserSession } from "@/features/dashboard/services";
import { DashboardBanner } from "@/components/layout/dashboard-banner";

export const metadata: Metadata = {
  title: "Clientes | kairos Stylos",
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
      <DashboardBanner
        title="Directorio de Clientes"
        subtitle="Historial dinámico de clientes generado desde facturación."
      />

      <ClientClient initialClients={clients} sessionUser={sessionUser} />
    </div>
  );
}
