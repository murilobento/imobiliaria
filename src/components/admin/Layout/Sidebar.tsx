'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Building, 
  MapPin, 
  UserCog,
  DollarSign,
  X 
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: Home,
    permission: null // Dashboard é acessível para todos
  },
  { 
    name: 'Financeiro', 
    href: '/admin/financeiro', 
    icon: DollarSign,
    permission: null // Sistema financeiro acessível para todos os usuários autenticados
  },
  { 
    name: 'Clientes', 
    href: '/admin/clientes', 
    icon: Users,
    permission: 'clients.view' as const
  },
  { 
    name: 'Imóveis', 
    href: '/admin/imoveis', 
    icon: Building,
    permission: 'properties.view' as const
  },
  { 
    name: 'Cidades', 
    href: '/admin/cidades', 
    icon: MapPin,
    permission: 'cities.create' as const // Apenas admin pode gerenciar cidades
  },
  { 
    name: 'Usuários', 
    href: '/admin/usuarios', 
    icon: UserCog,
    permission: 'users.view' as const // Apenas admin pode gerenciar usuários
  },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission } = usePermissions()

  // Filtrar itens de navegação baseado nas permissões do usuário
  const visibleNavigation = navigationItems.filter(item => {
    // Se não tem permissão definida, é acessível para todos
    if (!item.permission) return true
    
    // Verificar se o usuário tem a permissão necessária
    return hasPermission(item.permission)
  })

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      role="navigation"
      aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}