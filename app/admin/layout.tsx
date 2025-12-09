"use client"

import ProtectedRoute from '@/components/admin/ProtectedRoute'
import Sidebar from '@/components/admin/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5">
        <Sidebar />
        <main className="flex-1 overflow-auto md:ml-0">
          <div className="p-4 md:p-6 pt-16 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

