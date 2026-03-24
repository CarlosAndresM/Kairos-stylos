import { Metadata } from "next";
import NominaClient from "./nomina-client";
import { LoadingGate } from "@/components/ui/loading-gate";

export const metadata: Metadata = {
  title: "Nomina Tecnicos | Kyroy Stilos",
  description: "Cálculo de nómina y comisiones para administradores",
};

export default async function NominaPage() {
  return (
    <LoadingGate>
        <NominaClient />
    </LoadingGate>
  );
}
