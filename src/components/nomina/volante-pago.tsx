'use client';

import React, { Suspense, lazy } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, Download, Receipt } from "lucide-react";
import { VolantePDF } from "./volante-pdf";
import { cn } from "@/lib/utils";

const PDFDownloadLink = lazy(() =>
  import("@react-pdf/renderer").then((mod) => ({ default: mod.PDFDownloadLink }))
);

const fmt = (n: any) => {
  const val = Number(n) || 0;
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    maximumFractionDigits: 0 
  }).format(val);
};

export function VolantePago({ data, auditData = [] }: { data: any, auditData?: any[] }) {
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => { setIsClient(true); }, []);

  const handlePrint = () => { window.print(); };

  const devengos = [
    { desc: 'Sueldo Base', val: Number(data.ND_BASE || 0) },
    { desc: 'Comisiones (SVC/PRD)', val: Number(data.ND_COMISIONES || 0) },
    { desc: 'Bonificaciones / Otros', val: Number(data.ND_BONOS || 0) },
  ].filter(i => i.val > 0);

  const deducciones = [
    { desc: 'Servicio Trabajador (Cuota)', val: Number(data.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) },
    { desc: 'Vales (Cuota)', val: Number(data.ND_DEDUCCIONES_VALES || 0) },
  ].filter(i => i.val > 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Actions */}
      <div className="flex justify-end gap-3 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>

        {isClient && (
          <Suspense fallback={<Button disabled size="sm" className="gap-2 rounded-xl bg-emerald-400"><Download className="h-4 w-4" /> Cargando...</Button>}>
            <PDFDownloadLink
              document={<VolantePDF data={data} logoUrl="/LOGO.png" auditData={auditData} />}
              fileName={`Volante_${data.TR_NOMBRE}_${data.periodoRange.replace(/ /g, '_')}.pdf`}
            >
              {({ loading }) => (
                <Button variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white shadow-lg shadow-emerald-500/20" disabled={loading}>
                  <Download className="h-4 w-4" /> {loading ? 'Generando...' : 'Descargar PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </Suspense>
        )}
      </div>

      {/* Volante Card */}
      <div className="bg-white border rounded-xl shadow-sm text-slate-900 font-sans print:border-black print:shadow-none overflow-hidden">
        {/* Cabecera */}
        <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm border">
               <img src="/LOGO.png" alt="kairos Stylos" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic">kairos Stylos</h2>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FF7E5F]">Comprobante de Nómina</h3>
            <p className="text-[10px] font-medium text-slate-400">VP-{data.ND_IDDETALLE_PK?.toString().padStart(5, '0')}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 p-8 gap-x-12 border-b bg-white/50">
          <div className="space-y-1.5">
             <InfoRow label="Colaborador" value={data.TR_NOMBRE} bold />
             <InfoRow label="Cargo" value={data.RL_NOMBRE || '---'} />
             <InfoRow label="Sucursal" value={data.SC_NOMBRE || 'Global'} />
          </div>
          <div className="space-y-1.5">
             <InfoRow label="Periodo" value={data.periodoRange} bold />
             <InfoRow label="ID Trabajador" value={`#${data.TR_IDTRABAJADOR_FK}`} />
             <InfoRow label="Fecha Proceso" value={new Date().toLocaleDateString('es-CO')} />
          </div>
        </div>

        {/* Conceptos Table */}
        <div className="p-8 space-y-8">
          <div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
               <Receipt className="size-3" /> Devengado
             </h4>
             <table className="w-full text-xs">
               <thead>
                 <tr className="border-b text-slate-400">
                   <th className="text-left font-bold pb-2 uppercase tracking-tighter">Descripción</th>
                   <th className="text-right font-bold pb-2 uppercase tracking-tighter w-40">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {devengos.map((d, i) => (
                   <tr key={i} className="hover:bg-slate-50/50">
                     <td className="py-2.5 font-medium text-slate-600">{d.desc}</td>
                     <td className="py-2.5 text-right font-bold text-slate-900">{fmt(d.val)}</td>
                   </tr>
                 ))}
               </tbody>
               <tfoot>
                 <tr className="font-bold border-t-2 border-slate-200">
                   <td className="pt-3 text-slate-400 uppercase text-[10px]">Subtotal Devengado</td>
                   <td className="pt-3 text-right text-slate-900">
                      {fmt(Number(data.ND_BASE || 0) + Number(data.ND_COMISIONES || 0) + Number(data.ND_BONOS || 0))}
                   </td>
                 </tr>
               </tfoot>
             </table>
          </div>

          <div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Deducido</h4>
             <table className="w-full text-xs">
               <thead>
                 <tr className="border-b text-slate-400">
                   <th className="text-left font-bold pb-2 uppercase tracking-tighter">Descripción</th>
                   <th className="text-right font-bold pb-2 uppercase tracking-tighter w-40">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {deducciones.map((d, i) => (
                   <tr key={i} className="hover:bg-slate-50/50">
                     <td className="py-2.5 font-medium text-slate-600">{d.desc}</td>
                     <td className="py-2.5 text-right font-bold text-red-600">-{fmt(d.val)}</td>
                   </tr>
                 ))}
               </tbody>
               <tfoot>
                 <tr className="font-bold border-t-2 border-slate-200">
                   <td className="pt-3 text-slate-400 uppercase text-[10px]">Subtotal Deducciones</td>
                   <td className="pt-3 text-right text-red-600">
                      -{fmt(Number(data.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) + Number(data.ND_DEDUCCIONES_VALES || 0))}
                   </td>
                 </tr>
               </tfoot>
             </table>
          </div>
        </div>

        {/* Detalle de Actividad (Nuevos campos) */}
        {auditData.length > 0 && (
          <div className="px-8 pb-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 border-t pt-8">
              <Receipt className="size-3" /> Detalle de Actividad
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-400">
                    <th className="text-left font-bold px-3 py-2.5 uppercase tracking-tighter">Fecha</th>
                    <th className="text-left font-bold px-3 py-2.5 uppercase tracking-tighter">Tipo</th>
                    <th className="text-left font-bold px-3 py-2.5 uppercase tracking-tighter">Descripción</th>
                    <th className="text-center font-bold px-2 py-2.5 uppercase tracking-tighter">Cant</th>
                    <th className="text-right font-bold px-3 py-2.5 uppercase tracking-tighter">V. Unit</th>
                    <th className="text-right font-bold px-3 py-2.5 uppercase tracking-tighter">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-medium">{new Date(item.FC_FECHA).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider",
                          item.PF_TIPO_ITEM === 'SERVICIO' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          {item.PF_TIPO_ITEM}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-700 truncate max-w-[150px]">{item.PF_DESCRIPCION}</td>
                      <td className="px-2 py-2 text-center font-black text-slate-900 bg-slate-50/50">{item.PF_CANTIDAD}</td>
                      <td className="px-3 py-2 text-right text-slate-500 font-medium">{fmt(item.PF_VALOR_UNITARIO)}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-900">{fmt(item.PF_COMISION_VALOR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Neto Final */}
         <div className="mx-8 mb-8 p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-xl">
            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Neto Pagado</span>
            <span className="text-3xl font-black italic tracking-tighter">{fmt(Number(data.ND_TOTAL_NETO || 0))}</span>
         </div>


      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string, value: string, bold?: boolean }) {
   return (
    <div className="flex flex-col">
       <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{label}</span>
       <span className={cn(
         "text-xs uppercase tracking-tight",
         bold ? (label === 'Colaborador' ? 'font-black text-[#00CED1]' : 'font-black text-slate-900') : 'font-bold text-slate-600'
       )}>{value}</span>
    </div>
  );
}
