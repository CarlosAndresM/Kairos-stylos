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

  const finalSvc = auditData.filter(i => i.PF_TIPO_ITEM === 'SERVICIO');
  const finalPrd = auditData.filter(i => i.PF_TIPO_ITEM === 'PRODUCTO');

  const statsSvc = {
    count: finalSvc.reduce((acc, curr) => acc + Number(curr.PF_CANTIDAD || 0), 0),
    total: finalSvc.reduce((acc, curr) => acc + Number(curr.PF_COMISION_VALOR || 0), 0)
  };

  const statsPrd = {
    count: finalPrd.reduce((acc, curr) => acc + Number(curr.PF_CANTIDAD || 0), 0),
    total: finalPrd.reduce((acc, curr) => acc + Number(curr.PF_COMISION_VALOR || 0), 0)
  };

  const devengos = [
    { desc: 'Sueldo Base', val: Number(data.ND_BASE || 0) },
    { desc: 'Comisiones Servicios', val: statsSvc.total, count: statsSvc.count },
    { desc: 'Comisiones Productos', val: statsPrd.total, count: statsPrd.count },
    { desc: 'Bonificaciones / Otros', val: Number(data.ND_BONOS || 0) },
  ].filter(i => i.val > 0 || i.count > 0);

  const deducciones = [
    { desc: 'Servicio Trabajador (Cuota)', val: Number(data.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) },
    { desc: 'Vales (Cuota)', val: Number(data.ND_DEDUCCIONES_VALES || 0) },
  ].filter(i => i.val > 0);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Actions */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          <Printer className="h-3 w-3" /> Imprimir
        </Button>

        {isClient && (
          <Suspense fallback={<Button disabled size="sm" className="gap-2 rounded-lg bg-emerald-400 text-[10px]"><Download className="h-3 w-3" /> Cargando...</Button>}>
            <PDFDownloadLink
              document={<VolantePDF data={data} logoUrl="/LOGO.png" auditData={auditData} />}
              fileName={`Volante_${data.TR_NOMBRE}_${data.periodoRange.replace(/ /g, '_')}.pdf`}
            >
              {({ loading }) => (
                <Button variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white shadow-lg shadow-emerald-500/10 text-[10px] font-bold uppercase tracking-wider" disabled={loading}>
                  <Download className="h-3 w-3" /> {loading ? 'Generando...' : 'Descargar PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </Suspense>
        )}
      </div>

      {/* Volante Card */}
      <div className="bg-white border rounded-xl shadow-xl text-slate-900 font-sans print:border-black print:shadow-none overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* Cabecera compacta */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-lg shadow-sm border">
              <img src="/LOGO.png" alt="kairos Stylos" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tighter italic leading-none">kairos Stylos</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sistema de Gestión de Nómina</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF7E5F]">Comprobante</h3>
            <p className="text-[10px] font-black text-slate-900">VP-{data.ND_IDDETALLE_PK?.toString().padStart(5, '0')}</p>
          </div>
        </div>

        {/* Info Grid compacta */}
        <div className="grid grid-cols-2 px-6 py-4 gap-x-8 border-b bg-white/50">
          <div className="space-y-2">
            <InfoRow label="Colaborador" value={data.TR_NOMBRE} bold />
            <div className="flex gap-4">
              <InfoRow label="Cargo" value={data.RL_NOMBRE || '---'} />
              <InfoRow label="Sucursal" value={data.SC_NOMBRE || 'Global'} />
            </div>
          </div>
          <div className="space-y-2">
            <InfoRow label="Periodo Liquidado" value={data.periodoRange} bold />
            <div className="flex gap-4">
              <InfoRow label="ID" value={`#${data.TR_IDTRABAJADOR_FK}`} />
              <InfoRow label="Emisión" value={new Date().toLocaleDateString('es-CO')} />
            </div>
          </div>
        </div>

        {/* Conceptos Seccionados - Uno debajo del otro */}
        <div className="px-6 py-6 space-y-10">
          <div className="space-y-6">
            {/* Devengados */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2 border-l-4 border-emerald-500 pl-3">
                Devengado (Ingresos)
              </h4>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-100">
                    {devengos.map((d: any, i) => (
                      <tr key={i} className="group">
                        <td className="py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-tight text-xs">
                              {d.desc} {d.count > 0 ? `(${d.count})` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-black text-slate-900 border-b border-slate-50">{fmt(d.val)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t-2 border-slate-200">
                    <td className="pt-3 text-slate-400 uppercase text-[10px] italic">Total Devengado</td>
                    <td className="pt-3 text-right text-emerald-600 text-sm">
                      {fmt(devengos.reduce((acc, curr) => acc + curr.val, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Separador visual */}
            <div className="border-t border-slate-100 my-4" />

            {/* Deducciones */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2 border-l-4 border-red-500 pl-3">
                Deducciones (Egresos)
              </h4>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-100">
                  {deducciones.length > 0 ? deducciones.map((d, i) => (
                    <tr key={i}>
                      <td className="py-2 font-bold text-slate-600">{d.desc}</td>
                      <td className="py-2 text-right font-black text-red-600">-{fmt(d.val)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-[10px] text-slate-400 italic">No hay deducciones en este periodo</td>
                    </tr>
                  )}
                </tbody>
                {deducciones.length > 0 && (
                  <tfoot>
                    <tr className="font-bold border-t border-slate-200">
                      <td className="pt-2 text-slate-400 uppercase text-[9px] italic">Total Deducciones</td>
                      <td className="pt-2 text-right text-red-600 text-xs">
                        -{fmt(deducciones.reduce((acc, curr) => acc + curr.val, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Neto Final Compacto */}
        <div className="mx-6 mb-6 p-4 bg-slate-900 text-white rounded-xl flex justify-between items-center shadow-lg border-t-4 border-[#FF7E5F]">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none mb-1">Total Neto a Recibir</span>
            <span className="text-[10px] font-bold text-slate-300 italic">Liquidación Semanal Confirmada</span>
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{fmt(Number(data.ND_TOTAL_NETO || 0))}</span>
        </div>

        <div className="px-6 py-2 bg-slate-50 border-t flex justify-center">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Este comprobante es personal e intransferible y resume su actividad laboral en el periodo indicado.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string, value: string, bold?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-0.5">{label}</span>
      <span
        className={cn(
          "text-[11px] uppercase tracking-tight leading-tight",
          bold ? (label === 'Colaborador' ? 'font-black text-[#00CED1]' : 'font-black text-slate-900') : 'font-bold text-slate-600'
        )}
      >
        {value}
      </span>
    </div>
  );
}

