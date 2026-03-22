'use client'

import * as React from 'react'
import { Search, DollarSign, ArrowUpCircle, History, Filter } from 'lucide-react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCredits, payCredit } from '@/features/billing/credit-services'
import { toast } from '@/lib/toast-helper'
import { LoadingGate } from '@/components/ui/loading-gate'

export default function CreditsPage() {
  const [mounted, setMounted] = React.useState(false)
  const [credits, setCredits] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')

  React.useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const res = await getCredits()
    if (res.success) setCredits(res.data)
    setLoading(false)
  }

  const handlePay = async (id: number, currentDebt: number) => {
    const amount = prompt(`Monto a pagar para el crédito #${id}: \nSaldo pendiente: $${currentDebt.toLocaleString()}`, currentDebt.toString())
    if (!amount || isNaN(Number(amount))) return

    const res = await payCredit(id, Number(amount))
    if (res.success) {
      toast.success('Pago exitoso', 'El saldo del crédito ha sido actualizado.')
      fetchData()
    } else {
      toast.error('Error', res.error || 'Ocurrió un problema al procesar el pago.')
    }
  }

  const filteredCredits = credits.filter(c => 
    c.FC_NUMERO_FACTURA.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.FC_CLIENTE_NOMBRE.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.FC_CLIENTE_TELEFONO.includes(searchTerm)
  )

  const totalDebt = credits.reduce((acc, curr) => acc + Number(curr.CR_VALOR_PENDIENTE), 0)

  if (!mounted) return null

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
            Cuentas por Cobrar <span className="text-[#FF7E5F]">(Créditos)</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-widest italic">
            Monitor de deudas de clientes y pagos pendientes.
          </p>
        </div>

        <Card className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-black text-white p-4 min-w-[240px]">
           <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Inversión Pendiente:</span>
           <span className="text-2xl font-black italic">$ {totalDebt.toLocaleString()}</span>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-100 dark:bg-slate-900 p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input 
            placeholder="BUSCAR POR FACTURA, CLIENTE O TELÉFONO..."
            className="pl-10 h-11 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-slate-950 font-black text-xs uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <LoadingGate>
        <div className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b-2 border-black">
              <TableRow>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] px-6">Factura</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Sucursal</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Cliente</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Servicios</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Total Factura</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-right">Saldo Pendiente</TableHead>
                <TableHead className="font-black text-slate-500 uppercase tracking-widest text-[10px] text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredits.length > 0 ? (
                filteredCredits.map((credit, i) => (
                  <TableRow key={credit.CR_IDCREDITO_PK} className="hover:bg-slate-50 group border-b border-slate-100">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                          #{credit.FC_NUMERO_FACTURA}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                           Registrado: {format(new Date(credit.CR_FECHA), 'dd MMM, HH:mm', { locale: es })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-xs uppercase text-slate-600">
                       {credit.sucursal_nombre}
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                          {credit.cliente_display || credit.FC_CLIENTE_NOMBRE}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                           {credit.FC_CLIENTE_TELEFONO}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        {credit.servicios || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-slate-400">
                       $ {Number(credit.FC_TOTAL).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                       <span className="text-sm font-black text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-1 border border-red-100 dark:border-red-900/50 rounded-none italic">
                          $ {Number(credit.CR_VALOR_PENDIENTE).toLocaleString()}
                       </span>
                    </TableCell>
                    <TableCell className="text-center">
                       <Button 
                        size="sm"
                        onClick={() => handlePay(credit.CR_IDCREDITO_PK, Number(credit.CR_VALOR_PENDIENTE))}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                       >
                         Abonar / Liquidar
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-400 py-10 italic uppercase font-bold text-xs">
                    No se encontraron créditos pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </LoadingGate>
    </div>
  )
}
