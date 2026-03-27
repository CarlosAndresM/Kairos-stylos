import { Metadata } from 'next';
import { getAllValesService } from '@/features/vales/services';
import { getTrabajadores } from '@/features/trabajadores/services';
import { ValesClient } from '@/app/dashboard/vales/vales-client';
import { DashboardBanner } from '@/components/layout/dashboard-banner';

export const metadata: Metadata = {
  title: 'Vales | kairos Stylos',
  description: 'Gestión de vales (anticipos) a trabajadores',
};

export default async function ValesPage() {
  const [valesRes, trabajadoresRes] = await Promise.all([
    getAllValesService(),
    getTrabajadores()
  ]);

  const vales = valesRes.success ? valesRes.data : [];

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
      />
    </div>
  );
}
