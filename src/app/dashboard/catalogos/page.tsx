import { Metadata } from "next";
import { getServices, getProducts } from "@/features/catalog/services";
import { CatalogClient } from "@/app/dashboard/catalogos/catalog-client";
import { DashboardBanner } from "@/components/layout/dashboard-banner";
import { getCurrentUserSession } from "@/features/dashboard/services";

export const metadata: Metadata = {
  title: "Catálogos | kairos Stylos",
  description: "Gestión de servicios y productos",
};

export default async function CatalogosPage() {
  const [servicesRes, productsRes, sessionRes] = await Promise.all([
    getServices(),
    getProducts(),
    getCurrentUserSession(),
  ]);

  const services = servicesRes.success ? servicesRes.data : [];
  const products = productsRes.success ? productsRes.data : [];
  const sessionUser = sessionRes.success ? sessionRes.data : null;

  return (
    <div className="space-y-8 pb-12">
      <DashboardBanner
        title="Catálogos"
        subtitle={<>Administra los <span className="text-[#FF7E5F] font-bold">servicios</span> y <span className="text-[#FF7E5F] font-bold">productos</span> ofrecidos en tus sucursales.</>}
      />

      <CatalogClient
        initialServices={services as any[]}
        initialProducts={products as any[]}
        sessionUser={sessionUser}
      />
    </div>
  );
}
