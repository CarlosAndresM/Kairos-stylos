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
  Lock
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
  getPayrollWorkers
} from "@/features/nomina/services";
import { crearValeCompletado } from "@/features/vales/services";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function NominaClient() {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 0 }));
  const [nominaData, setNominaData] = useState<any[]>([]);
  const [nominaBatch, setNominaBatch] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [valeOpen, setValeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);

  // States for Vale Modal
  const [selectedWorker, setSelectedWorker] = useState("");
  const [valeAmount, setValeAmount] = useState("");
  const [valeInstallments, setValeInstallments] = useState("4");
  const [valeStartDate, setValeStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // States for Config Modal
  const [svcPercent, setSvcPercent] = useState("50");
  const [prdPercent, setPrdPercent] = useState("100");
  const [configStartDate, setConfigStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    getPayrollWorkers().then(res => {
      if (res.success) setWorkers(res.data || []);
    });
    fetchNomina();
  }, [startDate]);

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

  const handleCreateVale = async () => {
    if (!selectedWorker || !valeAmount || !valeStartDate) {
      toast.error("Complete todos los campos");
      return;
    }

    setLoading(true);
    const res = await crearValeCompletado({
      TR_IDTRABAJADOR_FK: parseInt(selectedWorker),
      VL_VALOR_TOTAL: parseFloat(valeAmount),
      VL_NUMERO_CUOTAS: parseInt(valeInstallments),
      VL_FECHA_INICIO_COBRO: new Date(valeStartDate),
      VL_ESTADO: 'PENDIENTE'
    });

    if (res.success) {
      toast.success(res.message);
      setValeOpen(false);
      // Reset
      setValeAmount("");
      setSelectedWorker("");
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleProcesar = async () => {
    setLoading(true);
    try {
      const res = await procesarNominaSemanal({ startDate, endDate });
      if (res.success) {
        toast.success(res.message);
        await fetchNomina();
      } else {
        toast.error(res.error);
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
      toast.success(res.message);
      await fetchNomina();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleBorrar = async () => {
    if (!nominaBatch) return;
    if (!confirm("¿Está seguro de borrar este proceso de nómina?")) return;

    setLoading(true);
    const res = await deleteNomina(nominaBatch.NM_IDNOMINA_PK);
    if (res.success) {
      toast.success(res.message);
      await fetchNomina();
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    const res = await saveNominaConfig({
      NC_PORCENTAJE_SERVICIO: parseFloat(svcPercent),
      NC_PORCENTAJE_PRODUCTO: parseFloat(prdPercent),
      NC_FECHA_INICIO: new Date(configStartDate)
    });

    if (res.success) {
      toast.success(res.message);
      fetchConfigs();
      // Opcional: setConfigOpen(false); // Podríamos dejarlo abierto para que vea el registro agregado
    } else {
      toast.error(res.error);
    }
  };

  const currentRangeLabel = `${format(startDate, "dd MMM", { locale: es })} - ${format(endDate, "dd MMM yyyy", { locale: es })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Banknote className="h-8 w-8 text-emerald-600" />
            Gesti&oacute;n de N&oacute;mina
          </h1>
          <p className="text-sm text-slate-500 font-medium italic">
            C&aacute;lculo semanal de comisiones, sueldos y cuotas de vales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setValeOpen(true)}
            className="border-slate-200 text-slate-600 font-bold text-[10px] tracking-widest uppercase h-9 rounded-none px-4"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Nuevo Vale
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfigOpen(true)}
            className="border-slate-200 text-slate-600 font-bold text-[10px] tracking-widest uppercase h-9 rounded-none px-4"
          >
            <Settings className="mr-2 h-4 w-4" />
            Parametrizar N&oacute;mina
          </Button>
          <Button
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="border-slate-200 text-slate-600 font-bold text-[10px] tracking-widest uppercase h-9 rounded-none px-4"
          >
            <History className="mr-2 h-4 w-4" />
            Hist&oacute;rico
          </Button>
        </div>
      </div>

      {/* Rango de Fechas */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
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
          <Button
            disabled={loading}
            onClick={handleProcesar}
            className="bg-slate-900 hover:bg-black text-white font-black text-[10px] tracking-widest uppercase rounded-none px-6 h-9"
          >
            {loading ? <RefreshCw className="animate-spin mr-2 h-3.5 w-3.5" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            PROCESAR N&Oacute;MINA
          </Button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="border border-slate-200 bg-white/50 backdrop-blur-sm overflow-hidden min-h-[400px]">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <TableRow>
              <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] px-6">Trabajador</TableHead>
              <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Base</TableHead>
              <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Comisiones (Neto)</TableHead>
              <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Deducciones Vales</TableHead>
              <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right px-6">Total a Pagar</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nominaData.length > 0 ? (
              nominaData.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="font-bold text-slate-900 text-xs px-6 uppercase tracking-tight">{item.TR_NOMBRE}</TableCell>
                  <TableCell className="text-right font-medium text-xs">$ {item.ND_BASE.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-xs text-emerald-600">$ {item.ND_COMISIONES.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium text-xs text-red-600 tracking-tighter">
                    - $ {item.ND_DEDUCCIONES_VALES.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-black text-sm text-slate-900 px-6">$ {item.ND_TOTAL_NETO.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center py-10 italic text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="h-8 w-8 opacity-20" />
                    <p className="text-xs font-medium">No hay una n&oacute;mina procesada para esta semana.</p>
                    <Button variant="outline" size="sm" onClick={handleProcesar} className="h-8 text-[10px] font-black uppercase">Click para procesar</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Acciones */}
      {nominaData.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-6 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total acumulado de la semana</span>
            <span className="text-2xl font-black italic">$ {nominaData.reduce((acc, curr) => acc + curr.ND_TOTAL_NETO, 0).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn(
              "text-[10px] font-black px-3 py-1 border uppercase tracking-widest mr-4",
              nominaBatch.NM_ESTADO === 'CONFIRMADA' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-amber-500/20 border-amber-500 text-amber-400"
            )}>
              ESTADO: {nominaBatch.NM_ESTADO}
            </span>

            {nominaBatch.NM_ESTADO !== 'CONFIRMADA' && (
              <>
                <Button
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-white/5 font-bold text-[10px] rounded-none h-11 px-4 uppercase"
                  onClick={handleBorrar}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 font-bold text-[10px] rounded-none h-11 px-6 uppercase"
                  onClick={handleProcesar}
                  disabled={loading}
                >
                  Volver a Procesar
                </Button>
                <Button
                  onClick={handleConfirmar}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-widest uppercase rounded-none h-11 px-8"
                >
                  Confirmar Liquidaci&oacute;n
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal Configuraci&oacute;n */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-4xl rounded-none border-2 border-slate-900 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
              <Settings className="h-5 w-5 text-emerald-400" />
              Parametrizar N&oacute;mina
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Columna Izquierda: Formulario */}
            <div className="p-8 space-y-6 bg-white border-r border-slate-100">
              <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 flex gap-3">
                <Info className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  Define nuevos porcentajes. La vigencia aplicar&aacute; para cualquier n&oacute;mina cuya fecha de inicio sea igual o posterior.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Comisi&oacute;n Servicio (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={svcPercent}
                      onChange={(e) => setSvcPercent(e.target.value)}
                      className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12 text-lg pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Descuento Producto (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={prdPercent}
                      onChange={(e) => setPrdPercent(e.target.value)}
                      className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12 text-lg pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vigencia desde (Fecha de Inicio)</Label>
                <Input
                  type="date"
                  value={configStartDate}
                  onChange={(e) => setConfigStartDate(e.target.value)}
                  className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={() => setConfigOpen(false)}
                  className="flex-1 font-bold text-xs rounded-none h-12"
                >
                  CERRAR
                </Button>
                <Button
                  onClick={handleSaveConfig}
                  className="flex-1 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-none h-12 uppercase tracking-widest"
                >
                  GUARDAR NUEVA VIGENCIA
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Historial */}
            <div className="bg-slate-50 p-6 flex flex-col h-full overflow-hidden">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Historial de Vigencias</h4>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {configs.map((cfg, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-4 shadow-sm relative group overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Desde: {cfg.NC_FECHA_INICIO ? format(new Date(cfg.NC_FECHA_INICIO), 'dd/MM/yyyy') : '---'}</span>
                      {idx === 0 && <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 font-bold uppercase tracking-tighter">Vigente</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase text-[8px]">Svc: <span className="text-slate-900 font-black">{cfg.NC_PORCENTAJE_SERVICIO}%</span></p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase text-[8px]">Prd: <span className="text-slate-900 font-black">{cfg.NC_PORCENTAJE_PRODUCTO}%</span></p>
                      </div>
                    </div>
                  </div>
                ))}
                {configs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 italic space-y-2 py-20">
                    <History className="h-10 w-10" />
                    <p className="text-xs font-bold">Sin registros previos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Crear Vale */}
      <Dialog open={valeOpen} onOpenChange={setValeOpen}>
        <DialogContent className="max-w-md rounded-none border-2 border-slate-900 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
              <Banknote className="h-5 w-5 text-emerald-400" />
              Registrar Nuevo Vale
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Trabajador</Label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full h-12 rounded-none border-slate-300 focus:border-slate-900 font-bold px-4 text-sm bg-white"
              >
                <option value="">Seleccione trabajador...</option>
                {workers.map(w => (
                  <option key={w.TR_IDTRABAJADOR_PK} value={w.TR_IDTRABAJADOR_PK}>{w.TR_NOMBRE}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monto Total del Vale ($)</Label>
              <Input
                type="number"
                value={valeAmount}
                onChange={(e) => setValeAmount(e.target.value)}
                className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12 text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cuotas Semanales</Label>
                <Input
                  type="number"
                  value={valeInstallments}
                  onChange={(e) => setValeInstallments(e.target.value)}
                  className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fecha Inicio Cobro</Label>
                <Input
                  type="date"
                  value={valeStartDate}
                  onChange={(e) => setValeStartDate(e.target.value)}
                  className="rounded-none border-slate-300 focus:border-slate-900 font-black h-12"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setValeOpen(false)}
                className="flex-1 font-bold text-xs rounded-none h-12"
              >
                CANCELAR
              </Button>
              <Button
                onClick={handleCreateVale}
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-none h-12 uppercase tracking-widest"
              >
                {loading ? "CREANDO..." : "CREAR VALE"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
