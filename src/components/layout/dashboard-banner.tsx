'use client'

import * as React from 'react'

interface DashboardBannerProps {
    title: React.ReactNode
    subtitle?: React.ReactNode
    extra?: React.ReactNode
    actions?: React.ReactNode
}

export function DashboardBanner({ title, subtitle, extra, actions }: DashboardBannerProps) {
    return (
        <div className="relative overflow-hidden p-8 md:p-12 border-b border-slate-200 dark:border-slate-800 shadow-2xl group bg-slate-950 min-h-[240px] flex flex-col justify-end">
            {/* Background Banner with Dark Overlay Filter */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                    src="/BANNER-KAIROS-STYLOS.png"
                    alt="Banner Background"
                    className="w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-[40s] ease-linear"
                />
                {/* Gradient Fades for typical Web Banner feel - Lightened */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/30 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent z-10" />
            </div>

            {/* Top Bar inside Banner */}
            {actions && (
                <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30">
                    {actions}
                </div>
            )}

            <div className="relative z-20 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col gap-3">
                    {/* Title con tipografía impactante en blanco para contraste */}
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-slate-200 font-bold text-lg md:text-xl drop-shadow-md">
                            {subtitle}
                        </p>
                    )}
                </div>

                {extra && (
                    <div className="flex items-center gap-3">
                        {extra}
                    </div>
                )}
            </div>
        </div>
    )
}
