'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/admin'
    })

    // Skip 'admin' segment and process the rest
    const adminIndex = segments.indexOf('admin')
    const relevantSegments = segments.slice(adminIndex + 1)

    let currentPath = '/admin'

    relevantSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === relevantSegments.length - 1

      // Map segment names to readable labels
      const labelMap: Record<string, string> = {
        'clientes': 'Clientes',
        'imoveis': 'Imóveis',
        'cidades': 'Cidades',
        'novo': 'Novo',
        'nova': 'Nova'
      }

      // For dynamic routes like [id], show "Editar"
      const isId = segment.match(/^[a-f0-9-]{36}$/i) // UUID pattern
      const label = isId ? 'Editar' : labelMap[segment] || segment

      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    })

    return breadcrumbs
  }

  const breadcrumbItems = items || generateBreadcrumbs()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}
            
            {index === 0 && (
              <Home className="h-4 w-4 text-gray-400 mr-2" />
            )}

            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`text-sm font-medium ${
                  item.current 
                    ? 'text-gray-900' 
                    : 'text-gray-500'
                }`}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}