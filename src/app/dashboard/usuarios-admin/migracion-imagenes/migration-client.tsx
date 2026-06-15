'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface TempImage {
  id: string;
  real_id?: number;
  url: string;
  parent_id: number;
  source: string;
  json_index?: number;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  newUrl?: string;
}

export function MigrationClient() {
  const [images, setImages] = useState<TempImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/migrate-images/list');
      const data = await res.json();
      if (data.success) {
        setImages(data.data.map((img: any) => ({ ...img, status: 'pending' })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const startMigration = async () => {
    setIsMigrating(true);
    
    for (let i = 0; i < images.length; i++) {
      if (images[i].status === 'success') continue;

      // Actualizar estado a processing
      setImages(prev => {
        const copy = [...prev];
        copy[i].status = 'processing';
        return copy;
      });

      try {
        const res = await fetch('/api/migrate-images/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(images[i])
        });
        const data = await res.json();

        setImages(prev => {
          const copy = [...prev];
          if (data.success) {
            copy[i].status = 'success';
            copy[i].newUrl = data.newUrl;
          } else {
            copy[i].status = 'error';
            copy[i].errorMessage = data.error || 'Error desconocido';
          }
          return copy;
        });
      } catch (e: any) {
        setImages(prev => {
          const copy = [...prev];
          copy[i].status = 'error';
          copy[i].errorMessage = e.message;
          return copy;
        });
      }
    }
    setIsMigrating(false);
  };

  const pendingCount = images.filter(i => i.status === 'pending').length;
  const successCount = images.filter(i => i.status === 'success').length;
  const errorCount = images.filter(i => i.status === 'error').length;
  const progress = images.length === 0 ? 0 : Math.round(((successCount + errorCount) / images.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-center min-w-[100px]">
            <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
            <p className="text-xl font-black text-slate-800 dark:text-white">{images.length}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center min-w-[100px]">
            <p className="text-xs text-emerald-600 font-bold uppercase">Éxito</p>
            <p className="text-xl font-black text-emerald-600">{successCount}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center min-w-[100px]">
            <p className="text-xs text-red-600 font-bold uppercase">Error</p>
            <p className="text-xl font-black text-red-600">{errorCount}</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={fetchImages} 
            disabled={isMigrating || loading}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </Button>
          <Button 
            onClick={startMigration} 
            disabled={isMigrating || pendingCount === 0}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isMigrating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
            {isMigrating ? 'Migrando...' : 'Iniciar Migración'}
          </Button>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: \`\${progress}%\` }}></div>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0">
            <TableRow>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>URL Antigua</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((img) => (
              <TableRow key={img.id}>
                <TableCell>
                  {img.status === 'pending' && <span className="text-slate-400 text-xs font-bold px-2 py-1 bg-slate-100 rounded-md">PENDIENTE</span>}
                  {img.status === 'processing' && <span className="text-blue-500 text-xs font-bold px-2 py-1 bg-blue-50 rounded-md flex items-center gap-1"><Loader2 className="size-3 animate-spin"/> MIGRANDO</span>}
                  {img.status === 'success' && <span className="text-emerald-600 text-xs font-bold px-2 py-1 bg-emerald-50 rounded-md flex items-center gap-1"><CheckCircle className="size-3"/> ÉXITO</span>}
                  {img.status === 'error' && <span className="text-red-600 text-xs font-bold px-2 py-1 bg-red-50 rounded-md flex items-center gap-1"><XCircle className="size-3"/> ERROR</span>}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                    {img.source} #{img.parent_id}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-slate-500" title={img.url}>
                  {img.url.split('/').pop()}
                </TableCell>
                <TableCell className="text-xs">
                  {img.status === 'success' && <span className="text-emerald-600 truncate max-w-[200px] block" title={img.newUrl}>{img.newUrl?.split('/').pop()}</span>}
                  {img.status === 'error' && <span className="text-red-500">{img.errorMessage}</span>}
                  {img.status === 'pending' && <span className="text-slate-300">-</span>}
                </TableCell>
              </TableRow>
            ))}
            {images.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 h-24">No hay imágenes temporales por migrar 🎉</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
