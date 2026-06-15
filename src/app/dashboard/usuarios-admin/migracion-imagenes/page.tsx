import { MigrationClient } from "./migration-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Migración de Imágenes | Kairos & Stylos",
};

export default function MigracionImagenesPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Migración de Imágenes Temporales</h1>
        <p className="text-slate-500 mt-2">
          Esta herramienta mueve las imágenes atascadas en la carpeta temporal hacia sus carpetas definitivas en Digital Ocean.
        </p>
      </div>
      <MigrationClient />
    </div>
  );
}
