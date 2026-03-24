import { Metadata } from "next";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeftRight, History, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Servicios de Trabajador | Kyroy Stilos",
  description: "Gestión de deudas y créditos de personal",
};

async function getServiciosTrabajador() {
  try {
    const [rows]: any = await db.execute(`
      SELECT st.*, t.TR_NOMBRE as trabajador_nombre, f.FC_NUMERO_FACTURA
      FROM KS_SERVICIOS_TRABAJADOR st
      JOIN KS_TRABAJADORES t ON st.TR_IDTRABAJADOR_FK = t.TR_IDTRABAJADOR_PK
      LEFT JOIN KS_FACTURAS f ON st.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
      ORDER BY st.ST_FECHA DESC
    `);
    return rows;
  } catch (error) {
    console.error("Error fetching servicios trabajador:", error);
    return [];
  }
}

export default async function ServicioTrabajadorPage() {
  const servicios = await getServiciosTrabajador();

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF7E5F]/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#FF7E5F]/10 rounded-xl">
              <ArrowLeftRight className="size-5 text-[#FF7E5F]" />
            </div>
            <span className="text-[10px] font-bold text-[#FF7E5F] uppercase tracking-[0.2em]">Finanzas Internas</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3">
            Servicio de <span className="text-[#FF7E5F]">Trabajador</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
            Administra los créditos otorgados al personal y el seguimiento de cuotas pendientes para nómina.
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200 rounded-3xl shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-3">
                <History className="size-4 text-[#FF7E5F]" /> Historial de Créditos Personal
            </h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-b border-slate-100">
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[120px]">Registro #</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider w-[180px] text-center">Fecha Inicio</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Colaborador</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Factura Origen</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center">Cuotas</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[160px]">Valor Total</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-center w-[140px]">Estado</TableHead>
                <TableHead className="px-6 py-5 font-bold text-slate-500 text-[10px] uppercase tracking-wider text-right w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicios.length > 0 ? (
                servicios.map((s: any) => (
                  <TableRow key={s.ST_IDSERVICIO_TRABAJADOR_PK} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">ST-{s.ST_IDSERVICIO_TRABAJADOR_PK}</span>
                        <span className="text-[9px] text-slate-400 font-medium tabular-nums uppercase">Creado: {format(new Date(s.ST_FECHA), 'dd/MM/yy')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-slate-600 font-bold text-[10px] tabular-nums">
                            <Calendar className="size-3 text-[#FF7E5F]" />
                            {format(new Date(s.ST_FECHA_INICIO_COBRO), 'dd MMM, yyyy', { locale: es })}
                        </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-[#FF7E5F] font-bold text-[10px] border border-white shadow-sm">
                          {s.trabajador_nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase">{s.trabajador_nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      {s.FC_NUMERO_FACTURA ? (
                        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                          #{s.FC_NUMERO_FACTURA}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300 uppercase italic">Directo</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                        <span className="text-xs font-black text-slate-400">{s.ST_NUMERO_CUOTAS} <span className="text-[9px] font-bold uppercase ml-0.5">Semanas</span></span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right font-black text-sm text-slate-900 tabular-nums">
                      $ {Number(s.ST_VALOR_TOTAL).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold tracking-tight border",
                        s.ST_ESTADO === 'PAGADO' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        s.ST_ESTADO === 'PENDIENTE' ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {s.ST_ESTADO}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <Button variant="ghost" size="icon" className="size-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-[#FF7E5F] transition-all">
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <ArrowLeftRight className="size-8 text-slate-200" />
                        </div>
                        <p className="text-slate-400 italic text-sm font-medium">No se han registrado créditos de personal aún.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
