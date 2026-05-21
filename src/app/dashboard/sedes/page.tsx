import { Metadata } from "next";
import { getSedes } from "@/features/trabajadores/services";
import { SedesClient } from "./sedes-client";
import { DashboardBanner } from "@/components/layout/dashboard-banner";
import { getCurrentUserSession } from "@/features/dashboard/services";

export const metadata: Metadata = {
  title: "Sucursales | kairos Stylos",
  description: "Administración de sedes y sucursales",
};

export default async function SedesPage() {
  const [sedesRes, sessionRes] = await Promise.all([
    getSedes(),
    getCurrentUserSession(),
  ]);

  const sedes = sedesRes.success ? (sedesRes.data as any[]) : [];
  const sessionUser = sessionRes.success ? sessionRes.data : null;

  return (
    <div className="space-y-6 pb-6">
      <DashboardBanner
        title="Sucursales"
        subtitle="Gestión de puntos de venta y locales físicos."
      />

      <SedesClient initialSedes={sedes} sessionUser={sessionUser} />
    </div>
  );
}
