import { Metadata } from "next";
import { getTrabajadores, getRoles, getSedes } from "@/features/trabajadores/services";
import AdminClient from "@/app/dashboard/usuarios-admin/admin-client";
import { DashboardBanner } from "@/components/layout/dashboard-banner";

export const metadata: Metadata = {
  title: "Administradores | kairos Stylos",
  description: "Gestión de usuarios administradores",
};

export default async function AdminPage() {
  const [workersRes, rolesRes, sedesRes] = await Promise.all([
    getTrabajadores(),
    getRoles(),
    getSedes(),
  ]);

  // Filtrar para mostrar SOLO administradores en esta página
  const admins = (workersRes.success ? workersRes.data : [])?.filter(
    (w: any) => w.RL_NOMBRE === 'ADMINISTRADOR_TOTAL'
  );

  // Filtrar solo el rol de administrador para la creación en esta página
  const roles = (rolesRes.success ? rolesRes.data : [])?.filter(
    (r: any) => r.RL_NOMBRE === 'ADMINISTRADOR_TOTAL'
  );

  const sedes = sedesRes.success ? sedesRes.data : [];

  return (
    <div className="space-y-8 pb-12">
      <DashboardBanner 
        title={<>Usuarios <span className="text-[#FF7E5F] font-bold">Administradores</span></>}
        subtitle="Gestiona el acceso de nivel administrativo al sistema."
      />

      <AdminClient 
        initialAdmins={admins || []} 
        roles={roles || []} 
        sedes={sedes || []} 
      />
    </div>
  );
}
