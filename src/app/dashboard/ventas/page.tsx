import { Metadata } from "next";
import { getRecentInvoices, getTechnicians, getPaymentMethods } from "@/features/billing/services";
import { getServices, getProducts } from "@/features/catalog/services";
import { getSedes } from "@/features/trabajadores/services";
import { getCurrentUserSession } from "@/features/dashboard/services";
import { BillingClient } from "@/app/dashboard/ventas/billing-client";

export const metadata: Metadata = {
  title: "Ventas | Kyroy Stilos",
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
    getRecentInvoices(sessionUser?.sucursal_id || 1), // Sucursal del usuario
    getTechnicians(),
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
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
          Ventas y Facturación
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
          Gestiona los registros de ventas y cobros en tiempo real.
        </p>
      </div>

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
