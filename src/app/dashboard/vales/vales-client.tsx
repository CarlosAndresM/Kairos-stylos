'use client'

import React, { useState } from 'react';
import { Plus, XCircle, Search, Calendar as CalendarIcon, Wallet, Info, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableFilter } from '@/components/ui/table-filter';
import { toast } from '@/lib/toast-helper';
import { format, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { NumericFormat } from 'react-number-format';

interface Adelanto {
  AD_IDADELANTO_PK: number;
  TR_IDTRABAJADOR_FK: number;
  AD_MONTO: string | number;
  AD_CUOTAS: number;
  AD_CUOTAS_PAGADAS: number;
  AD_ESTADO: 'PENDIENTE' | 'DESCONTADO' | 'ANULADO';
  AD_OBSERVACIONES: string | null;
  TR_NOMBRE: string;
  RL_NOMBRE: string;
  AD_FECHA_DESEMBOLSO: string | null;
  AD_FECHA_INICIO_COBRO: string | null;
  AD_FECHA_CREACION: string;
}

interface Trabajador {
  TR_IDTRABAJADOR_PK: number;
  TR_NOMBRE: string;
  RL_NOMBRE: string;
}

interface ValesClientProps {
  initialAdelantos: Adelanto[];
  trabajadores: Trabajador[];
}

export function ValesClient({ initialAdelantos, trabajadores }: ValesClientProps) {
  const [adelantos, setAdelantos] = useState<Adelanto[]>(initialAdelantos);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: string[] }>({});

  // Form State
  const [monto, setMonto] = useState('');
  const [cuotas, setCuotas] = useState('1');
  const [fechaDesembolso, setFechaDesembolso] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaInicioCobro, setFechaInicioCobro] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [observaciones, setObservaciones] = useState('');

  const [selectedAdelanto, setSelectedAdelanto] = useState<Adelanto | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const filteredAdelantos = React.useMemo(() => {
    return adelantos.filter(a => {
      const fullName = (a.TR_NOMBRE || '').toLowerCase();
      const searchMatch = fullName.includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      for (const [col, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue;

        let val = '';
        if (col === 'TRABAJADOR') val = a.TR_NOMBRE || '';
        else if (col === 'ROL') val = a.RL_NOMBRE || '';
        else val = (a[col as keyof Adelanto] as string)?.toString() || '';

        if (!values.includes(val)) return false;
      }
      return true;
    });
  }, [adelantos, searchTerm, activeFilters]);

  const getFilterOptions = (col: string) => {
    if (col === 'TRABAJADOR') {
      return Array.from(new Set(adelantos.map(a => a.TR_NOMBRE))).filter(Boolean).sort();
    }
    if (col === 'ROL') {
      return Array.from(new Set(adelantos.map(a => a.RL_NOMBRE))).filter(Boolean).sort();
    }
    return Array.from(new Set(adelantos.map(a => (a[col as keyof Adelanto] as string)?.toString() || ''))).filter(Boolean).sort();
  };

  const availableRoles = React.useMemo(() => {
    return Array.from(new Set(trabajadores.map(t => t.RL_NOMBRE))).filter(Boolean).sort();
  }, [trabajadores]);

  const workerOptions = React.useMemo(() => {
    const filtered = (selectedRole && selectedRole !== 'all')
      ? trabajadores.filter(t => t.RL_NOMBRE === selectedRole)
      : trabajadores;

    return filtered.map(t => ({
      label: t.TR_NOMBRE,
      value: t.TR_IDTRABAJADOR_PK
    }));
  }, [trabajadores, selectedRole]);

  const handleFilterChange = (col: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [col]: values }));
  };

  const safeFormat = (dateInput: any, formatStr: string) => {
    if (!dateInput) return '-';
    try {
      let d: Date;
      // Si ya es un objeto Date o algo que se comporte como tal
      if (dateInput instanceof Date || (typeof dateInput === 'object' && typeof (dateInput as any).getTime === 'function')) {
        d = new Date(dateInput);
      } else {
        const str = String(dateInput);
        // Manejar formato YYYY-MM-DD puro sin T (común en base de datos y inputs)
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          d = new Date(str + 'T00:00:00');
        } else if (str.includes(' ') && !str.includes('T')) {
          // Manejar "YYYY-MM-DD HH:mm:ss" convirtiéndolo a ISO
          d = new Date(str.replace(' ', 'T'));
        } else {
          d = new Date(str);
        }
      }

      if (isNaN(d.getTime())) return '-';
      return format(d, formatStr, { locale: es });
    } catch (e) {
      return '-';
    }
  };

  const getRepaymentRange = (selectedDateStr: string, role: string) => {
    if (!selectedDateStr) return null;
    const date = new Date(selectedDateStr + 'T00:00:00');

    if (role === 'ADMINISTRADOR_PUNTO') {
      const day = date.getDate();
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const midPoint = new Date(date.getFullYear(), date.getMonth(), 15);
      const secondHalfStart = new Date(date.getFullYear(), date.getMonth(), 16);

      return day <= 15
        ? { start: monthStart, end: midPoint, label: 'Quincena (1-15)' }
        : { start: secondHalfStart, end: monthEnd, label: 'Quincena (16-Fin)' };
    }

    return {
      start: startOfWeek(date, { weekStartsOn: 0 }),
      end: endOfWeek(date, { weekStartsOn: 0 }),
      label: 'Semana'
    };
  };

  const calculateSchedule = (adelanto: Adelanto) => {
    if (!adelanto.AD_FECHA_INICIO_COBRO) return [];

    const rawDate = adelanto.AD_FECHA_INICIO_COBRO as any;
    let startDate: Date;
    if (rawDate instanceof Date || (typeof rawDate === 'object' && typeof (rawDate as any).getTime === 'function')) {
      startDate = new Date(rawDate);
    } else {
      const str = String(rawDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        startDate = new Date(str + 'T00:00:00');
      } else if (str.includes(' ') && !str.includes('T')) {
        startDate = new Date(str.replace(' ', 'T'));
      } else {
        startDate = new Date(str);
      }
    }

    if (isNaN(startDate.getTime())) return [];

    const schedule = [];
    const cuotas = Number(adelanto.AD_CUOTAS || 1);
    const montoCuota = Number(adelanto.AD_MONTO || 0) / cuotas;

    for (let i = 0; i < cuotas; i++) {
      let date: Date;
      if (adelanto.RL_NOMBRE === 'ADMINISTRADOR_PUNTO') {
        const startIsSecondHalf = startDate.getDate() > 15;
        const totalQuincenas = i + (startIsSecondHalf ? 1 : 0);
        const monthOffset = Math.floor(totalQuincenas / 2);
        const isSecondHalf = totalQuincenas % 2 === 1;

        date = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, isSecondHalf ? 16 : 1);
      } else {
        date = new Date(startDate);
        date.setDate(startDate.getDate() + (i * 7));
      }

      schedule.push({
        numero: i + 1,
        fecha: date,
        monto: montoCuota,
        estado: (i + 1) <= Number(adelanto.AD_CUOTAS_PAGADAS || 0) ? 'PAGADA' : 'PENDIENTE'
      });
    }
    return schedule;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || !trabajadorId || !fechaDesembolso) {
      toast.error('Campos incompletos', 'Por favor llena todos los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        TR_IDTRABAJADOR_FK: parseInt(trabajadorId, 10),
        AD_MONTO: parseFloat(monto),
        AD_CUOTAS: parseInt(cuotas, 10) || 1,
        AD_FECHA_DESEMBOLSO: fechaDesembolso,
        AD_FECHA_INICIO_COBRO: fechaInicioCobro || null,
        AD_OBSERVACIONES: observaciones
      };

      const res = await fetch('/api/vales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Vale registrado', 'El vale se ha creado exitosamente.');
        setIsCreateModalOpen(false);
        // Reset form
        setMonto('');
        setCuotas('1');
        setTrabajadorId('');
        setObservaciones('');
        // Recargar la página para obtener la tabla fresca
        window.location.reload();
      } else {
        toast.error('Error', data.error || 'No se pudo crear el vale');
      }
    } catch (error) {
      toast.error('Error de red', 'No se pudo contactar con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnular = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas anular este vale?')) return;

    try {
      const res = await fetch(`/api/vales/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Vale anulado', 'El vale ha sido marcado como anulado.');
        setAdelantos(prev => prev.map(a =>
          a.AD_IDADELANTO_PK === id ? { ...a, AD_ESTADO: 'ANULADO' } : a
        ));
      } else {
        toast.error('Error', data.error || 'No se pudo anular el vale');
      }
    } catch (err) {
      toast.error('Error', 'No se pudo anular');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">Pendiente</Badge>;
      case 'DESCONTADO': return <Badge className="bg-green-500 hover:bg-green-600 text-white border-none">Descontado</Badge>;
      case 'ANULADO': return <Badge variant="destructive">Anulado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por trabajador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white shadow-lg shadow-[#FF7E5F]/20 rounded-xl"
        >
          <Plus className="mr-2 size-4" />
          Nuevo Vale
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="py-0 px-2">
                  <TableFilter
                    label="Trabajador"
                    options={getFilterOptions('TRABAJADOR')}
                    selectedValues={activeFilters['TRABAJADOR'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('TRABAJADOR', vals)}
                  />
                </TableHead>
                <TableHead className="py-0 px-2">
                  <TableFilter
                    label="Rol"
                    options={getFilterOptions('ROL')}
                    selectedValues={activeFilters['ROL'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('ROL', vals)}
                  />
                </TableHead>
                <TableHead>Monto</TableHead>
                <TableHead className="py-0 px-2">
                  <TableFilter
                    label="Estado"
                    options={getFilterOptions('AD_ESTADO')}
                    selectedValues={activeFilters['AD_ESTADO'] || []}
                    onFilterChange={(vals: string[]) => handleFilterChange('AD_ESTADO', vals)}
                  />
                </TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdelantos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Wallet className="size-8 mb-2 opacity-20" />
                      <p>No se encontraron vales</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdelantos.map((adelanto) => (
                  <TableRow key={adelanto.AD_IDADELANTO_PK}>
                    <TableCell className="font-medium text-xs text-slate-500">
                      {safeFormat(adelanto.AD_FECHA_CREACION, "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {adelanto.TR_NOMBRE}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {adelanto.RL_NOMBRE}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                      <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(adelanto.AD_MONTO))}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(adelanto.AD_ESTADO)}
                    </TableCell>
                    <TableCell className="w-[120px]">
                      {adelanto.AD_ESTADO !== 'ANULADO' && (
                        <div className="space-y-1">
                          <Progress
                            value={(Number(adelanto.AD_CUOTAS_PAGADAS) / Number(adelanto.AD_CUOTAS)) * 100}
                            className="h-1.5"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium whitespace-nowrap gap-2">
                            <span>{Math.round((Number(adelanto.AD_CUOTAS_PAGADAS) / Number(adelanto.AD_CUOTAS)) * 100)}%</span>
                            <span>{adelanto.AD_CUOTAS_PAGADAS}/{adelanto.AD_CUOTAS} cuotas</span>
                          </div>
                        </div>
                      )}
                      {adelanto.AD_ESTADO === 'ANULADO' && <span className="text-[10px] text-slate-400">-</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={adelanto.AD_OBSERVACIONES || ''}>
                      {adelanto.AD_OBSERVACIONES || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedAdelanto(adelanto); setIsDetailsOpen(true); }}
                          title="Ver detalles"
                        >
                          <Eye className="size-4 text-slate-500" />
                        </Button>
                        {adelanto.AD_ESTADO === 'PENDIENTE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAnular(adelanto.AD_IDADELANTO_PK)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                            title="Anular Vale"
                          >
                            <XCircle className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Vale de Nómina</DialogTitle>
            <DialogDescription>
              Asigna un vale a un trabajador que será descontado en su próximo pago.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rol del Trabajador</Label>
                <Select value={selectedRole} onValueChange={(val) => { setSelectedRole(val); setTrabajadorId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los roles</SelectItem>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Trabajador</Label>
                <ComboboxSearch
                  options={workerOptions}
                  value={trabajadorId ? parseInt(trabajadorId, 10) : ''}
                  onValueChange={(val) => setTrabajadorId(val.toString())}
                  placeholder={selectedRole ? "Seleccionar trabajador..." : "Primero selecciona un rol..."}
                  searchPlaceholder="Buscar por nombre..."
                  emptyText="No se encontraron trabajadores."
                  disabled={!selectedRole && workerOptions.length === 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <div className="relative">
                  <NumericFormat
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="$ "
                    placeholder="$ 0.00"
                    className="w-full h-10 border border-slate-200 dark:border-slate-800 rounded-md px-3 text-sm font-medium focus:ring-2 focus:ring-[#FF7E5F]/20 focus:border-[#FF7E5F] transition-all bg-white dark:bg-slate-900"
                    value={monto}
                    onValueChange={(values) => setMonto(values.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>N° de Cuotas (Semanales)</Label>
                <Input
                  type="number"
                  value={cuotas}
                  onChange={(e) => setCuotas(e.target.value)}
                  required
                  min="1"
                  step="1"
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha Desembolso</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={fechaDesembolso}
                    onChange={(e) => setFechaDesembolso(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{selectedRole === 'ADMINISTRADOR_PUNTO' ? 'Inicio de Cobro (Quincena)' : 'Inicio de Cobro (Semana)'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal pl-3",
                        !fechaInicioCobro && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                      {fechaInicioCobro ? (
                        format(new Date(fechaInicioCobro + 'T00:00:00'), "PPP", { locale: es })
                      ) : (
                        <span>{selectedRole === 'ADMINISTRADOR_PUNTO' ? 'Seleccionar quincena...' : 'Seleccionar semana...'}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInicioCobro ? new Date(fechaInicioCobro + 'T00:00:00') : undefined}
                      onSelect={(date) => setFechaInicioCobro(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      locale={es}
                      modifiers={{
                        selectedRange: (date) => {
                          const range = getRepaymentRange(fechaInicioCobro, selectedRole);
                          if (!range) return false;
                          return isWithinInterval(date, { start: range.start, end: range.end });
                        }
                      }}
                      modifiersClassNames={{
                        selectedRange: "bg-primary/10 text-primary font-bold rounded-none first:rounded-l-md last:rounded-r-md"
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {fechaInicioCobro && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {(() => {
                      const range = getRepaymentRange(fechaInicioCobro, selectedRole);
                      return range ? `${range.label}: ${format(range.start, 'dd/MM')} - ${format(range.end, 'dd/MM')}` : '';
                    })()}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones (Opcional)</Label>
              <Textarea
                placeholder="Motivo u observaciones del vale..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#FF7E5F] hover:bg-[#FF7E5F]/90 text-white"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Vale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLES */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Info className="size-6 text-primary" />
              Detalles del Vale
            </DialogTitle>
            <DialogDescription>
              Cronograma de pagos y estado detallado del anticipo.
            </DialogDescription>
          </DialogHeader>

          {selectedAdelanto && (
            <div className="space-y-6 pt-4">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Trabajador</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedAdelanto.TR_NOMBRE}</p>
                  <Badge variant="secondary" className="text-[9px] uppercase">{selectedAdelanto.RL_NOMBRE}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Monto Total</p>
                  <p className="text-lg font-black text-primary">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(selectedAdelanto.AD_MONTO))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fecha Desembolso</p>
                  <p className="text-sm font-medium">
                    {safeFormat(selectedAdelanto.AD_FECHA_DESEMBOLSO, "dd 'de' MMMM, yyyy")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estado General</p>
                  <Badge
                    variant={selectedAdelanto.AD_ESTADO === 'DESCONTADO' ? 'default' : selectedAdelanto.AD_ESTADO === 'ANULADO' ? 'destructive' : 'secondary'}
                    className="text-[10px] h-5"
                  >
                    {selectedAdelanto.AD_ESTADO}
                  </Badge>
                </div>
              </div>

              {/* Cronograma */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <CalendarIcon className="size-4 text-primary" />
                  Cronograma de Pagos
                </h4>
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead className="text-[10px] uppercase font-bold py-2">Cuota</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold py-2 text-center">Fecha</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold py-2 text-center">Valor</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold py-2 text-right">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculateSchedule(selectedAdelanto).map((item) => (
                        <TableRow key={item.numero}>
                          <TableCell className="py-2 text-sm font-medium">#{item.numero}</TableCell>
                          <TableCell className="py-2 text-sm text-center">
                            {safeFormat(item.fecha, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="py-2 text-sm font-semibold text-center">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.monto)}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Badge
                              variant={item.estado === 'PAGADA' ? 'default' : 'outline'}
                              className={cn(
                                "text-[9px] h-4 tracking-tighter",
                                item.estado === 'PAGADA' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "text-slate-400"
                              )}
                            >
                              {item.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedAdelanto.AD_OBSERVACIONES && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 mb-1">Observaciones</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{selectedAdelanto.AD_OBSERVACIONES}"</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDetailsOpen(false)} className="w-full">
              Cerrar Detalles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
