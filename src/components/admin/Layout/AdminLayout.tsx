'use client'

import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ErrorProvider } from '../Common/ErrorProvider'
import { ErrorBoundary } from '../Common/ErrorBoundary'
import LoadingSpinner from '../Common/LoadingSpinner'
import { useResponsiveNavigation } from '@/hooks/useResponsiveNavigation'
import { useAuth } from '@/components/auth/SupabaseAuthProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useResponsiveNavigation()
  const { user, loading } = useAuth()
  const router = useRouter()

  const isAuthenticated = !!user
  const isLoading = loading

  // Redirect to login if not authenticated (middleware should handle this, but as backup)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show loading spinner while authentication is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Don't render admin layout if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ErrorProvider>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
          
          {/* Main content */}
          <div className="flex-1 transition-all duration-300">
            {/* Top bar */}
            <TopBar onMenuClick={toggleSidebar} />
            
            {/* Page content */}
            <div className="py-6">
              {children}
            </div>
          </div>
        </div>
      </ErrorProvider>
    </ErrorBoundary>
  )
}