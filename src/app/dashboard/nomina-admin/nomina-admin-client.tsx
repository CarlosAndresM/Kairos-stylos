'use client'

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  PlayCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Info,
  ChevronLeft,
  ChevronRight,
  UserCog,
  FileText,
  Save
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, setDate, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  procesarNominaAdmins,
  confirmarNomina,
  getNominaByRange,
  deleteNomina,
  getPayrollWorkers
} from "@/features/nomina/services";
import { toast } from "@/lib/toast-helper";
import { cn } from "@/lib/utils";
import { DashboardBanner } from '@/components/layout/dashboard-banner';
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericFormat } from 'react-number-format';

function getQuincenas(month: Date) {
  const q1Start = startOfMonth(month);
  const q1End = setDate(startOfMonth(month), 15);
  const q2Start = setDate(startOfMonth(month), 16);
  const q2End = endOfMonth(month);
  return [
    { start: q1Start, end: q1End, label: "1ra Quincena" },
    { start: q2Start, end: q2End, label: "2da Quincena" }
  ];
}

export default function NominaAdminClient() {
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedQuincenaIdx, setSelectedQuincenaIdx] = useState(new Date().getDate() <= 15 ? 0 : 1);

  const { startDate, endDate, quincenas, activeQuincena } = useMemo(() => {
    const qs = getQuincenas(currentMonth);
    return {
      quincenas: qs,
      activeQuincena: qs[selectedQuincenaIdx],
      startDate: qs[selectedQuincenaIdx].start,
      endDate: qs[selectedQuincenaIdx].end
    };
  }, [currentMonth, selectedQuincenaIdx]);

  const [nominaData, setNominaData] = useState<any[]>([]);
  const [nominaBatch, setNominaBatch] = useState<any>(null);

  // Para configuración manual de salarios
  const [admins, setAdmins] = useState<any[]>([]);
  const [manualSalaries, setManualSalaries] = useState<Record<number, string>>({});
  const [configSalariesMode, setConfigSalariesMode] = useState(false);

  // Para Volantes
  const [showVolante, setShowVolante] = useState<any>(null);

  useEffect(() => {
    fetchNomina();
  }, [startDate, endDate]);

  useEffect(() => {
    if (configSalariesMode) {
      fetchAdmins();
    }
  }, [configSalariesMode]);

  const fetchAdmins = async () => {
    const res = await getPayrollWorkers('ADMINISTRADOR_PUNTO');
    if (res.success) {
      setAdmins(res.data || []);
      // Pre-poblar con el sueldo base si no hay nada
      const salaries: Record<number, string> = {};
      res.data?.forEach((a: any) => {
        salaries[a.TR_IDTRABAJADOR_PK] = a.TR_SUELDO_BASE?.toString() || "0";
      });
      setManualSalaries(salaries);
    }
  };

  const fetchNomina = async () => {
    setLoading(true);
    const res = await getNominaByRange(startDate, endDate, 'ADMINISTRADOR_PUNTO');
    if (res.success && res.data) {
      setNominaBatch(res.data);
      setNominaData(res.data.details || []);
    } else {
      setNominaBatch(null);
      setNominaData([]);
    }
    setLoading(false);
  };

  const handleProcesar = async () => {
    setLoading(true);
    try {
      const salariesArray = Object.entries(manualSalaries).map(([id, salary]) => ({
        workerId: parseInt(id),
        salary: parseFloat(salary) || 0
      }));

      const res = await procesarNominaAdmins({
        startDate,
        endDate,
        salaries: salariesArray
      });

      if (res.success) {
        toast.success(res.message || "Operación exitosa");
        setConfigSalariesMode(false);
        await fetchNomina();
      } else {
        toast.error(res.error || "Ocurrió un error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async () => {
    if (!nominaBatch) return;
    setLoading(true);
    const res = await confirmarNomina(nominaBatch.NM_IDNOMINA_PK);
    if (res.success) {
      toast.success(res.message || "Operación exitosa");
      await fetchNomina();
    } else {
      toast.error(res.error || "Ocurrió un error");
    }
    setLoading(false);
  };

  const handleBorrar = async () => {
    if (!nominaBatch) return;
    if (!confirm("¿Está seguro de borrar este proceso de nómina?")) return;

    setLoading(true);
    const res = await deleteNomina(nominaBatch.NM_IDNOMINA_PK);
    if (res.success) {
      toast.success(res.message || "Operación exitosa");
      await fetchNomina();
    } else {
      toast.error(res.error || "Ocurrió un error");
    }
    setLoading(false);
  };

  const currentRangeLabel = `${format(startDate, "dd MMM", { locale: es })} - ${format(endDate, "dd MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-6">
      <DashboardBanner
        title={<>Nómina <span className="text-[#FF7E5F]">Administradores</span> de Punto</>}
        subtitle="Liquidación quincenal para administradores con salarios manuales."
      />

      {/* Rango de Fechas - Quincenas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-black uppercase tracking-widest text-slate-900 w-32 text-center">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {quincenas.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedQuincenaIdx(idx)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                  selectedQuincenaIdx === idx
                    ? "bg-white dark:bg-slate-700 text-[#FF7E5F] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <CalendarIcon className="size-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{currentRangeLabel}</span>
          </div>

          {!nominaBatch && !configSalariesMode && (
            <Button
              onClick={() => setConfigSalariesMode(true)}
              className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl gap-2"
            >
              <UserCog className="size-4" />
              CONFIGURAR SALARIOS
            </Button>
          )}

          {configSalariesMode && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfigSalariesMode(false)}>Cancelar</Button>
              <Button
                onClick={handleProcesar}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl gap-2"
              >
                {loading ? <RefreshCw className="animate-spin size-4" /> : <PlayCircle className="size-4" />}
                PROCESAR NOMINA
              </Button>
            </div>
          )}
        </div>
      </div>

      {configSalariesMode ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm p-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserCog className="size-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Configuración de Salarios Manuales</h3>
                <p className="text-xs text-slate-500">Defina el sueldo devuelto para este periodo quincenal.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfigSalariesMode(false)} className="rounded-xl border border-slate-200">
                Cancelar
              </Button>
              <Button
                onClick={handleProcesar}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl gap-2 font-black"
              >
                {loading ? <RefreshCw className="animate-spin size-4" /> : <Save className="size-4" />}
                CONFIRMAR Y GENERAR NÓMINA
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/30">
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] px-6">Administrador</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Detalle</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Sucursal</TableHead>
                  <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right px-6">Sueldo Quincenal ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.TR_IDTRABAJADOR_PK} className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-slate-900">{admin.TR_NOMBRE}</span>
                        <span className="text-[10px] text-slate-400 font-medium">#{admin.TR_IDTRABAJADOR_PK}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-500">{admin.TR_TELEFONO || "S/N"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                        {admin.SC_NOMBRE || "GLOBAL"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="relative max-w-[200px] ml-auto">
                        <NumericFormat
                          thousandSeparator="."
                          decimalSeparator=","
                          prefix="$ "
                          className="w-full text-sm font-black text-right h-10 rounded-xl border border-slate-200 focus:ring-[#FF7E5F]/20 px-4"
                          value={manualSalaries[admin.TR_IDTRABAJADOR_PK] || ""}
                          onValueChange={(values) => {
                            setManualSalaries(prev => ({ ...prev, [admin.TR_IDTRABAJADOR_PK]: values.value }))
                          }}
                          placeholder="$ 0"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center py-10 italic text-slate-400">
                      No se encontraron administradores de punto activos para este periodo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <>
          {/* Tabla de Resultados */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] px-6">Administrador</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Sueldo Base</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Deducciones (Vales)</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right px-6">Total a Pagar</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nominaData.length > 0 ? (
                    nominaData.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <TableCell className="font-bold text-slate-900 text-xs px-6 uppercase tracking-tight">{item.TR_NOMBRE}</TableCell>
                        <TableCell className="text-right font-medium text-xs">$ {item.ND_BASE.toLocaleString('es-CO')}</TableCell>
                        <TableCell className="text-right font-medium text-xs text-red-600 tracking-tighter">
                          - $ {((item.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) + (item.ND_DEDUCCIONES_ADELANTOS || 0)).toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-slate-900 px-6">
                          $ {Math.max(0, Number(item.ND_TOTAL_NETO || 0)).toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 border-[#FF7E5F]/30 text-[#FF7E5F] hover:bg-[#FF7E5F]/10 font-bold"
                            onClick={() => setShowVolante(item)}
                          >
                            <FileText className="size-3.5" />
                            VOLANTE
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center py-10 italic text-slate-400">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <AlertCircle className="h-8 w-8 opacity-20 mb-2" />
                          {nominaBatch ? (
                            <>
                              <p className="text-xs font-medium">Esta n&oacute;mina se proces&oacute; pero result&oacute; vac&iacute;a.</p>
                              <p className="text-[10px] text-slate-500 uppercase">Aseg&uacute;rese de tener administradores activos para estas fechas.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-medium uppercase tracking-widest opacity-70">Seleccione un periodo y presione el bot&oacute;n superior para calcular.</p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer Acciones */}
          {nominaBatch && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:p-6 shadow-sm mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total acumulado quincena</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">$ {nominaData.reduce((acc, curr) => acc + Math.max(0, Number(curr.ND_TOTAL_NETO || 0)), 0).toLocaleString('es-CO')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider mr-4",
                  nominaBatch.NM_ESTADO === 'CONFIRMADA' ? "bg-green-50 border-green-300 text-green-600" : "bg-amber-50 border-amber-300 text-amber-600"
                )}>
                  {nominaBatch.NM_ESTADO}
                </span>

                {nominaBatch.NM_ESTADO !== 'CONFIRMADA' && (
                  <>
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 gap-2"
                      onClick={handleBorrar}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setConfigSalariesMode(true)}
                      disabled={loading}
                    >
                      Volver a Procesar
                    </Button>
                    <Button
                      onClick={handleConfirmar}
                      disabled={loading}
                      className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl gap-2"
                    >
                      Confirmar Liquidación
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Volante */}
      <Dialog open={!!showVolante} onOpenChange={() => setShowVolante(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden p-0 border border-slate-200 shadow-2xl">
          <DialogHeader className="p-6 bg-slate-950 text-white">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black uppercase tracking-tighter italic">Volante de Pago</DialogTitle>
              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">{activeQuincena.label}</div>
            </div>
          </DialogHeader>

          {showVolante && (
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                  <p className="text-lg font-black text-slate-900 uppercase">{showVolante.TR_NOMBRE}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Proceso</p>
                  <p className="text-sm font-bold text-slate-600">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Sueldo Base Periodo</span>
                  <span className="font-black text-slate-900">$ {showVolante.ND_BASE.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Deducciones Servicios (Préstamos)</span>
                  <span className="font-bold text-red-600">- $ {(showVolante.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Deducciones Vales (Adelantos)</span>
                  <span className="font-bold text-red-600">- $ {(showVolante.ND_DEDUCCIONES_ADELANTOS || 0).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                  <span className="text-xs font-black uppercase tracking-widest text-[#FF7E5F]">Neto Recibido</span>
                  <span className="text-2xl font-black text-slate-900">$ {Math.max(0, showVolante.ND_TOTAL_NETO).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="pt-8 text-center">
                <Button onClick={() => window.print()} className="w-full gap-2 bg-slate-900 text-white rounded-xl">
                  <FileText className="size-4" />
                  IMPRIMIR VOLANTE
                </Button>
                <p className="mt-4 text-[9px] text-slate-400 uppercase font-medium tracking-[0.2em]">Kyroy Stilos by Karen Ovalle - Documento Informativo</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
