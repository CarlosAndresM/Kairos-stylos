import { Metadata } from "next";
import CreditsClient from "./client-component";

export const metadata: Metadata = {
  title: "Créditos | kairos Stylos",
  description: "Gestión de cuentas por cobrar y créditos de clientes",
};

import { getCurrentUserSession } from "@/features/dashboard/services";

export default async function CreditsPage() {
  const sessionRes = await getCurrentUserSession();
  const sessionUser = sessionRes.success ? sessionRes.data : null;

  return (
    <div className="pb-12">
      <CreditsClient sessionUser={sessionUser} />
    </div>
  );
}
