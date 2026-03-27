'use client'

import { useState, useEffect } from 'react';
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
  Settings,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  History,
  Info,
  Banknote,
  Trash2,
  RefreshCw,
  Lock,
  Plus,
  Edit2,
  FileDown,
  Receipt
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  procesarNominaSemanal,
  confirmarNomina,
  getNominaConfigs,
  saveNominaConfig,
  getNominaByRange,
  deleteNomina,
  getPayrollWorkers,
  updateNominaConfig,
  deleteNominaConfig,
  getNominaAudit
} from "@/features/nomina/services";

import { toast } from "@/lib/toast-helper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { VolantePago } from '@/components/nomina/volante-pago';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DashboardBanner } from '@/components/layout/dashboard-banner';

export default function NominaClient() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 0 }));
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [nominaBatch, setNominaBatch] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  // States for Config Modal
  const [svcPercent, setSvcPercent] = useState("");
  const [prdPercent, setPrdPercent] = useState("");
  const [configStartDate, setConfigStartDate] = useState("");
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [showVolante, setShowVolante] = useState<any>(null);


  useEffect(() => {
    fetchNomina();
  }, [startDate, endDate]);

  useEffect(() => {
    if (configOpen) {
      fetchConfigs();
    }
  }, [configOpen]);

  const fetchConfigs = async () => {
    const res = await getNominaConfigs();
    if (res.success) setConfigs(res.data || []);
  };

  const fetchNomina = async () => {
    setLoading(true);
    const res = await getNominaByRange(startDate, endDate);
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
      const res = await procesarNominaSemanal({ startDate, endDate });
      if (res.success) {
        toast.success(res.message || "Operación exitosa");
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

  const handleSaveConfig = async () => {
    const configDate = new Date(configStartDate);
    configDate.setHours(12, 0, 0, 0); // Evitar problemas de zona horaria

    const payload = {
      NC_PORCENTAJE_SERVICIO: parseFloat(svcPercent),
      NC_PORCENTAJE_PRODUCTO: parseFloat(prdPercent),
      NC_FECHA_INICIO: configDate
    };

    const res = editingConfigId
      ? await updateNominaConfig(editingConfigId, payload)
      : await saveNominaConfig(payload);

    if (res.success) {
      toast.success(res.message || "Configuración guardada");
      fetchConfigs();
      setShowConfigForm(false);
      setEditingConfigId(null);
      setSvcPercent("");
      setPrdPercent("");
      setConfigStartDate("");
    } else {
      toast.error(res.error || "Error al guardar");
    }
  };

  const handleEditConfig = (cfg: any) => {
    setEditingConfigId(cfg.NC_IDCONFIG_PK);
    setSvcPercent(cfg.NC_PORCENTAJE_SERVICIO.toString());
    setPrdPercent(cfg.NC_PORCENTAJE_PRODUCTO.toString());
    setConfigStartDate(format(new Date(cfg.NC_FECHA_INICIO), 'yyyy-MM-dd'));
    setShowConfigForm(true);
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta configuración? Esto afectará los cálculos de las nóminas que aún no se han procesado.")) return;

    const res = await deleteNominaConfig(id);
    if (res.success) {
      toast.success(res.message || "Configuración eliminada");
      fetchConfigs();
    } else {
      toast.error(res.error || "No se pudo eliminar");
    }
  };



  const handleDownloadZip = () => {
    const startSimple = format(startDate, 'yyyy-MM-dd');
    const endSimple = format(endDate, 'yyyy-MM-dd');
    const url = `/api/nomina/zip-volantes?startDate=${startSimple}&endDate=${endSimple}&type=TECNICO`;
    
    toast.info("Generando archivo ZIP de volantes, por favor espere...");
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const currentRangeLabel = `${format(startDate, "dd MMM", { locale: es })} - ${format(endDate, "dd MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-6">
      <DashboardBanner
        title={<>Gestión <span className="text-[#FF7E5F]">Nómina</span> Técnicos</>}
        subtitle="Cálculo semanal de comisiones y sueldos para técnicos."
        extra={
          <Button
            variant="outline"
            onClick={() => setConfigOpen(true)}
            className="gap-2 bg-black/40 border-white/10 text-white hover:bg-black/60 shadow-2xl backdrop-blur-md rounded-xl"
          >
            <Settings className="size-4" />
            Parametrizar Nómina Técnicos
          </Button>
        }
      />

      {/* Rango de Fechas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-100 rounded-full">
            <CalendarIcon className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodo de Liquidaci&oacute;n (Dom - Sab)</p>
            <p className="text-lg font-black text-slate-900 capitalize">{currentRangeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newStart = addDays(startDate, -7);
              setStartDate(newStart);
              setEndDate(addDays(newStart, 6));
            }}
            className="font-bold text-xs"
          >
            ANTERIOR
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newStart = addDays(startDate, 7);
              setStartDate(newStart);
              setEndDate(addDays(newStart, 6));
            }}
            className="font-bold text-xs"
          >
            SIGUIENTE
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          {nominaBatch && (
            <Button
              variant="outline"
              onClick={handleDownloadZip}
              className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 rounded-xl gap-2 font-bold"
            >
              <FileDown className="size-4" />
              DESCARGAR VOLANTES (ZIP)
            </Button>
          )}
          <Button
            disabled={loading}
            onClick={handleProcesar}
            className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl gap-2"
          >
            {loading ? <RefreshCw className="animate-spin mr-2 h-3.5 w-3.5" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            PROCESAR NOMINA TÉCNICOS
          </Button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] px-6">Trabajador</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Comisiones (Neto)</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Servicio Trabajador</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Vales</TableHead>
                <TableHead className="font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right px-6">Total a Pagar</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nominaData.length > 0 ? (
                nominaData.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <TableCell className="font-bold text-slate-900 text-xs px-6 uppercase tracking-tight">{item.TR_NOMBRE}</TableCell>
                    <TableCell className="text-right font-bold text-xs text-emerald-600">$ {item.ND_COMISIONES.toLocaleString('es-CO')}</TableCell>
                    <TableCell className="text-right font-medium text-xs text-red-600 tracking-tighter">
                      - $ {(item.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs text-orange-600 tracking-tighter">
                      - $ {(item.ND_DEDUCCIONES_VALES || 0).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-right font-black text-sm text-slate-900 px-6">
                      $ {Math.max(0, Number(item.ND_TOTAL_NETO || 0)).toLocaleString('es-CO')}
                      {Number(item.ND_TOTAL_NETO) < 0 && (
                        <div className="text-[9px] text-red-500 font-bold uppercase mt-1">Saldo Negativo: $ {Math.abs(Number(item.ND_TOTAL_NETO)).toLocaleString('es-CO')}</div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex justify-end gap-1">

                        <button
                          onClick={() => setShowVolante(item)}
                          title="Ver Volante de Pago"
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all"
                        >
                          <Receipt className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center py-10 italic text-slate-400">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <AlertCircle className="h-8 w-8 opacity-20 mb-2" />
                      {nominaBatch ? (
                        <>
                          <p className="text-xs font-medium">Esta n&oacute;mina se proces&oacute; pero result&oacute; vac&iacute;a.</p>
                          <p className="text-[10px] text-slate-500 uppercase">Aseg&uacute;rese de tener trabajadores con el rol 'TECNICO' activos y con servicios en estas fechas.</p>
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
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total acumulado de la semana</span>
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
                  onClick={handleProcesar}
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
      {/* Modal Configuración */}
      <Dialog open={configOpen} onOpenChange={(open) => { setConfigOpen(open); if (!open) setShowConfigForm(false); }}>
        <DialogContent className="w-[1280px] max-w-[95vw] rounded-xl border border-slate-200 p-0 overflow-hidden shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader className="p-6 pr-14 border-b border-slate-100 flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-[#FF7E5F]" />
              <DialogTitle className="text-lg font-bold">
                Parametrizar Nomina Técnicos
              </DialogTitle>
            </div>
            <Button
              onClick={() => setShowConfigForm(!showConfigForm)}
              className={cn(
                "h-10 w-10 p-0 rounded-xl border-2 border-input transition-all",
                showConfigForm ? "bg-red-500 border-red-500 rotate-45 mr-2" : "bg-emerald-600 border-emerald-600 mr-2"
              )}
            >
              <Plus className="size-6 text-white" />
            </Button>
          </DialogHeader>

          <div className="relative h-[420px] overflow-hidden">
            {/* Fondo: Historial (Ocupa todo el ancho siempre para no aplastarse) */}
            <div className="bg-white p-6 flex flex-col h-full w-full overflow-hidden transition-opacity duration-300">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 px-2 flex items-center justify-between">
                <span>Historial de Vigencias en Sistema</span>
                <History className="size-3 text-slate-400" />
              </h4>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                <Table className="border-collapse">
                  <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 px-4 text-slate-500">Vigencia Desde</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 px-4 text-center text-slate-500">% COMISIÓN SVC</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 px-4 text-center text-slate-500">% COMISIÓN PRD</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 px-4 text-center text-slate-500">Estado</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 px-4 text-right text-slate-500 pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((cfg, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                        <TableCell className="py-4 px-4 text-[12px] font-bold text-slate-900">
                          {cfg.NC_FECHA_INICIO ? format(new Date(cfg.NC_FECHA_INICIO), 'dd/MM/yyyy') : '---'}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-[12px] font-black text-center text-slate-900">
                          {cfg.NC_PORCENTAJE_SERVICIO}%
                        </TableCell>
                        <TableCell className="py-4 px-4 text-[12px] font-black text-center text-slate-900">
                          {cfg.NC_PORCENTAJE_PRODUCTO}%
                        </TableCell>
                        <TableCell className="py-4 px-4 text-center">
                          {idx === 0 ? (
                            <span className="inline-flex bg-emerald-600 text-white text-[9px] px-2 py-0.5 font-black uppercase tracking-tighter shadow-sm">
                              Vigente
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase italic opacity-50 text-xs">Antiguo</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right pr-6">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => handleEditConfig(cfg)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteConfig(cfg.NC_IDCONFIG_PK)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {configs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center opacity-40 py-10 italic">
                          <div className="flex flex-col items-center gap-2">
                            <History className="h-10 w-10 text-slate-200" />
                            <p className="text-[12px] font-bold uppercase">Sin registros históricos de vigencia</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Capa Superior (Overlay): Formulario */}
            {showConfigForm && (
              <div className="absolute top-0 right-0 bottom-0 w-[400px] z-50 bg-white dark:bg-slate-900 border-l border-slate-200 shadow-xl animate-in slide-in-from-right duration-300 h-full p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {editingConfigId ? 'Editar Registro de Vigencia' : 'Nuevo Registro de Vigencia'}
                  </h4>
                </div>

                <div className="p-3 bg-emerald-100/50 border-l-4 border-emerald-500 flex gap-2">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-emerald-800 font-medium leading-tight">
                    {editingConfigId
                      ? 'Est&aacute; actualizando los par&aacute;metros de una vigencia existente. Esto afectar&aacute; los c&aacute;lculos futuros.'
                      : 'Al agregar una nueva vigencia, se aplicar&aacute; a los sueldos calculados desde la fecha seleccionada en adelante.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Comisi&oacute;n SVC (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={svcPercent}
                        onChange={(e) => setSvcPercent(e.target.value)}
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Comisi&oacute;n PRD (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={prdPercent}
                        onChange={(e) => setPrdPercent(e.target.value)}
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Vigencia desde (Inicio)</Label>
                  <Input
                    type="date"
                    value={configStartDate}
                    onChange={(e) => setConfigStartDate(e.target.value)}
                    placeholder="dd/mm/aaaa"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    onClick={handleSaveConfig}
                    className="w-full bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl"
                  >
                    AGREGAR VIGENCIA
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Volante */}
      <Dialog open={!!showVolante} onOpenChange={() => setShowVolante(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-50">
          <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">Comprobante de Pago</DialogTitle>
              <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold uppercase tracking-widest">Nomina Semanal</div>
            </div>
          </DialogHeader>

          {showVolante && (
            <div className="p-8">
              <VolantePago data={{ ...showVolante, periodoRange: currentRangeLabel }} />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
