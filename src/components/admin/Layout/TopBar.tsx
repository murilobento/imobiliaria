'use client'

import React, { useState } from 'react'
import { Menu, Bell, User, LogOut, Loader2, UserCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/SupabaseAuthProvider'
import Link from 'next/link'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, signOut, loading } = useAuth()
  const isLoading = loading

  // Função para obter o nome de exibição do usuário
  const getUserDisplayName = () => {
    if (!user) return 'Usuário'
    
    // Prioridade: nome dos metadados > nome do email > email
    const userName = user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'Usuário'
    
    return userName
  }

  // Função para obter o role traduzido
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'real-estate-agent':
        return 'Corretor'
      case 'authenticated':
        return 'Autenticado'
      default:
        return role
    }
  }

  // Função para verificar se é primeiro acesso
  const isFirstAccess = () => {
    return !user?.last_sign_in_at || user.last_sign_in_at === user.created_at
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setShowUserMenu(false)
    
    // O signOut agora é muito mais robusto e força o logout completo
    await signOut()
    // signOut já redireciona automaticamente, não precisa de código adicional
  }

  return (
    <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Page title on mobile */}
          <div className="lg:hidden ml-2">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <button 
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors relative"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Menu do usuário"
              aria-expanded={showUserMenu}
              disabled={isLoading || isLoggingOut}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {isLoading ? 'Carregando...' : getUserDisplayName()}
              </span>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <>
                {/* Backdrop for mobile */}
                <div 
                  className="fixed inset-0 z-10 sm:hidden"
                  onClick={() => setShowUserMenu(false)}
                />
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getRoleDisplayName(user?.user_metadata?.role || 'authenticated')} • {
                          isFirstAccess() ? 'Primeiro acesso' : 
                          user?.last_sign_in_at ? 
                            new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 
                            'Primeiro acesso'
                        }
                      </p>
                    </div>
                    
                    <Link
                      href="/admin/perfil"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCircle className="h-4 w-4 mr-3" />
                      Meu Perfil
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4 mr-3" />
                      )}
                      {isLoggingOut ? 'Saindo...' : 'Sair'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}