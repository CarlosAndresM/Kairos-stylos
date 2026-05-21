import { Metadata } from 'next';
import { getAllValesService } from '@/features/vales/services';
import { getTrabajadores, getSedes } from '@/features/trabajadores/services';
import { ValesClient } from '@/app/dashboard/vales/vales-client';
import { DashboardBanner } from '@/components/layout/dashboard-banner';
import { getCurrentUserSession } from "@/features/dashboard/services";

export const metadata: Metadata = {
  title: 'Vales | kairos Stylos',
  description: 'Gestión de vales (anticipos) a trabajadores',
};

export default async function ValesPage() {
  const [valesRes, trabajadoresRes, sedesRes, sessionRes] = await Promise.all([
    getAllValesService(),
    getTrabajadores(),
    getSedes(),
    getCurrentUserSession()
  ]);

  const vales = valesRes.success ? valesRes.data : [];
  const sessionUser = sessionRes.success ? sessionRes.data : null;
  const sucursales = sedesRes.success ? sedesRes.data : [];

  // Excluir administradores de la lista de trabajadores elegibles para adelantos
  const trabajadores = (trabajadoresRes.success ? trabajadoresRes.data : [])?.filter(
    (w: any) => w.RL_NOMBRE !== 'ADMINISTRADOR_TOTAL'
  );

  return (
    <div className="space-y-8 pb-12">
      <DashboardBanner
        title="Gestión de Vales"
        subtitle="Administra los anticipos de sueldo para los trabajadores de todas las sedes."
      />

      <ValesClient
        initialVales={(vales || []) as any[]}
        trabajadores={(trabajadores || []) as any[]}
        sucursales={(sucursales || []) as any[]}
        sessionUser={sessionUser}
      />
    </div>
  );
}
