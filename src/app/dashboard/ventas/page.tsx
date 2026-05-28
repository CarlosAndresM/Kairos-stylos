import { Metadata } from "next";
import { getRecentInvoices, getWorkers, getPaymentMethods } from "@/features/billing/services";
import { getServices, getProducts } from "@/features/catalog/services";
import { getSedes } from "@/features/trabajadores/services";
import { getCurrentUserSession } from "@/features/dashboard/services";
import { BillingClient } from "@/app/dashboard/ventas/billing-client";
import { DashboardBanner } from "@/components/layout/dashboard-banner";

export const metadata: Metadata = {
  title: "Ventas | kairos Stylos",
  description: "Gestión de facturación y ventas diarias",
};

export default async function VentasPage() {
  const sessionRes = await getCurrentUserSession();
  const sessionUser = sessionRes.success ? sessionRes.data : null;

  // Datos necesarios para la operación
  const [
    invoicesRes,
    techniciansRes,
    servicesRes,
    productsRes,
    paymentMethodsRes,
    sucursalesRes
  ] = await Promise.all([
    getRecentInvoices(sessionUser?.branchId), // Sucursal del usuario
    getWorkers(),
    getServices(),
    getProducts(),
    getPaymentMethods(),
    getSedes()
  ]);

  const invoices = invoicesRes.success ? invoicesRes.data : [];
  const technicians = techniciansRes.success ? techniciansRes.data : [];
  const services = servicesRes.success ? servicesRes.data : [];
  const products = productsRes.success ? productsRes.data : [];
  const paymentMethods = paymentMethodsRes.success ? paymentMethodsRes.data : [];
  const sucursales = sucursalesRes.success ? sucursalesRes.data : [];

  return (
    <div className="space-y-8 pb-12">
      <DashboardBanner
        title="Ventas y Facturación"
        subtitle="Gestiona los registros de ventas y cobros en tiempo real."
      />

      <BillingClient
        initialInvoices={invoices as any[]}
        technicians={technicians as any[]}
        services={services as any[]}
        products={products as any[]}
        paymentMethods={paymentMethods as any[]}
        sucursales={sucursales as any[]}
        sessionUser={sessionUser}
      />
    </div>
  );
}
