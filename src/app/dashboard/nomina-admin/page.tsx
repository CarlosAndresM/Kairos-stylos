import { Metadata } from "next";
import NominaAdminClient from "./nomina-admin-client";
import { LoadingGate } from "@/components/ui/loading-gate";

export const metadata: Metadata = {
  title: "Nomina Administradores | Kyroy Stilos",
  description: "Cálculo de nómina y sueldos para administradores de punto",
};

export default async function NominaAdminPage() {
  return (
    <LoadingGate>
      <NominaAdminClient />
    </LoadingGate>
  );
}
