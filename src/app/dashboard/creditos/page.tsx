import { Metadata } from "next";
import CreditsClient from "./client-component";

export const metadata: Metadata = {
  title: "Créditos | Kyroy Stilos",
  description: "Gestión de cuentas por cobrar y créditos de clientes",
};

export default function CreditsPage() {
  return (
    <div className="pb-12">
      <CreditsClient />
    </div>
  );
}
