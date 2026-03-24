import { Metadata } from "next";
import { getTrabajadores, getRoles, getSedes } from "@/features/trabajadores/services";
import { WorkerClient } from "@/app/dashboard/trabajadores/worker-client";
import { getCurrentUserSession } from "@/features/dashboard/services";

export const metadata: Metadata = {
  title: "Trabajadores | Kyros Stilos",
  description: "Gestión de personal y técnicos",
};

export default async function TrabajadoresPage() {
  const sessionRes = await getCurrentUserSession();
  const sessionUser = sessionRes.success ? sessionRes.data : null;
  const sucursalId = sessionUser?.role === 'ADMINISTRADOR_TOTAL' ? undefined : sessionUser?.branchId;

  const [workersRes, rolesRes, sedesRes] = await Promise.all([
    getTrabajadores(sucursalId),
    getRoles(),
    getSedes(),
  ]);

  // Filtrar para NO mostrar administradores totales en esta página
  const workers = (workersRes.success ? workersRes.data : [])?.filter(
    (w: any) => w.RL_NOMBRE !== 'ADMINISTRADOR_TOTAL'
  );

  // Filtrar roles permitidos para TRABAJADORES (Cajero/Admin Punto y Técnico)
  const roles = (rolesRes.success ? rolesRes.data : [])?.filter(
    (r: any) => r.RL_NOMBRE === 'ADMINISTRADOR_PUNTO' || r.RL_NOMBRE === 'TECNICO'
  );

  const sedes = sedesRes.success ? sedesRes.data : [];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-400 dark:to-white">
            Gestión de Personal
          </h1>
        </div>
      </div>

      <WorkerClient
        initialWorkers={workers || []}
        roles={roles || []}
        sedes={sedes || []}
        currentRole={sessionUser?.role}
        sucursalId={sessionUser?.branchId}
      />
    </div>
  );
}
