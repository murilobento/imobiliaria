import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminLayout } from '@/components/admin/Layout/AdminLayout'
import { Sidebar } from '@/components/admin/Layout/Sidebar'
import { TopBar } from '@/components/admin/Layout/TopBar'
import { Breadcrumbs } from '@/components/admin/Common/Breadcrumbs'

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    }),
    usePathname: () => '/admin/clientes',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock responsive navigation hook
vi.mock('@/hooks/useResponsiveNavigation', () => ({
    useResponsiveNavigation: () => ({
        isMobile: false,
        sidebarOpen: false,
        toggleSidebar: vi.fn(),
        closeSidebar: vi.fn()
    })
}))

// Mock network status hook
vi.mock('@/hooks/useNetworkStatus', () => ({
    useNetworkStatus: () => ({
        isOnline: true,
        isSlowConnection: false
    })
}))

// Mock auth provider
vi.mock('@/components/auth/AuthProvider', () => ({
    useAuth: () => ({
        user: { username: 'testuser', role: 'admin' },
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn()
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock other components that might be needed
vi.mock('@/components/admin/Common/ErrorProvider', () => ({
    ErrorProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('@/components/admin/Common/QueryProvider', () => ({
    QueryProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('@/components/admin/LazyComponents', () => ({
    AdminComponentPreloader: () => null
}))

describe('Responsive Navigation Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Breadcrumbs', () => {
        it('should generate breadcrumbs from pathname', () => {
            render(<Breadcrumbs />)

            expect(screen.getByText('Dashboard')).toBeInTheDocument()
            expect(screen.getByText('Clientes')).toBeInTheDocument()
        })

        it('should handle custom breadcrumb items', () => {
            const customItems = [
                { label: 'Dashboard', href: '/admin' },
                { label: 'Imóveis', href: '/admin/imoveis' },
                { label: 'Novo', current: true }
            ]

            render(<Breadcrumbs items={customItems} />)

            expect(screen.getByText('Dashboard')).toBeInTheDocument()
            expect(screen.getByText('Imóveis')).toBeInTheDocument()
            expect(screen.getByText('Novo')).toBeInTheDocument()
        })

        it('should not render if only one item', () => {
            const singleItem = [
                { label: 'Dashboard', current: true }
            ]

            const { container } = render(<Breadcrumbs items={singleItem} />)
            expect(container.firstChild).toBeNull()
        })
    })

    describe('Sidebar Navigation', () => {
        it('should render navigation items', () => {
            const mockOnClose = vi.fn()

            render(
                <Sidebar isOpen={true} onClose={mockOnClose} />
            )

            expect(screen.getByText('Dashboard')).toBeInTheDocument()
            expect(screen.getByText('Clientes')).toBeInTheDocument()
            expect(screen.getByText('Imóveis')).toBeInTheDocument()
            expect(screen.getByText('Cidades')).toBeInTheDocument()
            expect(screen.getByText('Usuários')).toBeInTheDocument()
        })

        it('should close sidebar when navigation item is clicked', async () => {
            const user = userEvent.setup()
            const mockOnClose = vi.fn()

            render(
                <Sidebar isOpen={true} onClose={mockOnClose} />
            )

            const clientesLink = screen.getByText('Clientes')
            await user.click(clientesLink)

            expect(mockOnClose).toHaveBeenCalled()
        })

        it('should show close button on mobile', async () => {
            const user = userEvent.setup()
            const mockOnClose = vi.fn()

            render(
                <Sidebar isOpen={true} onClose={mockOnClose} />
            )

            // The close button should be visible (though hidden on lg screens via CSS)
            const closeButton = screen.getByRole('button')
            await user.click(closeButton)

            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    describe('TopBar', () => {
        it('should render menu button for mobile', () => {
            const mockOnMenuClick = vi.fn()

            render(<TopBar onMenuClick={mockOnMenuClick} />)

            const menuButton = screen.getByLabelText('Abrir menu de navegação')
            expect(menuButton).toBeInTheDocument()
        })

        it('should open menu when menu button is clicked', async () => {
            const user = userEvent.setup()
            const mockOnMenuClick = vi.fn()

            render(<TopBar onMenuClick={mockOnMenuClick} />)

            const menuButton = screen.getByLabelText('Abrir menu de navegação')
            await user.click(menuButton)

            expect(mockOnMenuClick).toHaveBeenCalled()
        })

        it('should show user menu when clicked', async () => {
            const user = userEvent.setup()
            const mockOnMenuClick = vi.fn()

            render(<TopBar onMenuClick={mockOnMenuClick} />)

            const userButton = screen.getByLabelText('Menu do usuário')
            await user.click(userButton)

            await waitFor(() => {
                expect(screen.getByText('Meu Perfil')).toBeInTheDocument()
                expect(screen.getByText('Sair')).toBeInTheDocument()
            })
        })

        it('should close user menu when clicking outside', async () => {
            const user = userEvent.setup()
            const mockOnMenuClick = vi.fn()

            render(<TopBar onMenuClick={mockOnMenuClick} />)

            // Open user menu
            const userButton = screen.getByLabelText('Menu do usuário')
            await user.click(userButton)

            await waitFor(() => {
                expect(screen.getByText('Meu Perfil')).toBeInTheDocument()
            })

            // Click outside (on document body)
            await user.click(document.body)

            await waitFor(() => {
                expect(screen.queryByText('Meu Perfil')).not.toBeInTheDocument()
            })
        })
    })

    describe('AdminLayout Integration', () => {
        it('should render complete layout structure', () => {
            render(
                <AdminLayout>
                    <div>Test Content</div>
                </AdminLayout>
            )

            expect(screen.getByText('Admin Panel')).toBeInTheDocument()
            expect(screen.getByText('Test Content')).toBeInTheDocument()
            expect(screen.getByText('Dashboard')).toBeInTheDocument() // Breadcrumbs
        })

        it('should handle sidebar toggle', async () => {
            const user = userEvent.setup()

            render(
                <AdminLayout>
                    <div>Test Content</div>
                </AdminLayout>
            )

            // Find and click menu button
            const menuButton = screen.getByLabelText('Abrir menu de navegação')
            await user.click(menuButton)

            // Sidebar should be accessible (though visibility is controlled by CSS)
            expect(screen.getByRole('navigation')).toBeInTheDocument()
        })
    })

    describe('Mobile Responsiveness', () => {
        beforeEach(() => {
            // Mock mobile viewport
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768,
            })

            // Mock matchMedia for responsive tests
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: vi.fn().mockImplementation(query => ({
                    matches: query.includes('max-width'),
                    media: query,
                    onchange: null,
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                })),
            })
        })

        it('should adapt to mobile viewport', () => {
            render(
                <AdminLayout>
                    <div>Mobile Content</div>
                </AdminLayout>
            )

            // Menu button should be visible on mobile
            const menuButton = screen.getByLabelText('Abrir menu de navegação')
            expect(menuButton).toBeInTheDocument()

            // Content should still be rendered
            expect(screen.getByText('Mobile Content')).toBeInTheDocument()
        })

        it('should handle touch interactions', async () => {
            const user = userEvent.setup()

            render(
                <AdminLayout>
                    <div>Touch Content</div>
                </AdminLayout>
            )

            // Simulate touch interaction with menu button
            const menuButton = screen.getByLabelText('Abrir menu de navegação')

            // Touch events
            fireEvent.touchStart(menuButton)
            fireEvent.touchEnd(menuButton)

            // Should still work like a click
            await user.click(menuButton)

            expect(screen.getByRole('navigation')).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            const mockOnMenuClick = vi.fn()

            render(<TopBar onMenuClick={mockOnMenuClick} />)

            expect(screen.getByLabelText('Abrir menu de navegação')).toBeInTheDocument()
            expect(screen.getByLabelText('Menu do usuário')).toBeInTheDocument()
            expect(screen.getByLabelText('Notificações')).toBeInTheDocument()
        })

        it('should support keyboard navigation', async () => {
            const user = userEvent.setup()
            const mockOnClose = vi.fn()

            render(
                <Sidebar isOpen={true} onClose={mockOnClose} />
            )

            // Tab through navigation items
            await user.tab()
            expect(screen.getByText('Dashboard')).toHaveFocus()

            await user.tab()
            expect(screen.getByText('Clientes')).toHaveFocus()

            // Enter should activate link
            await user.keyboard('{Enter}')
            expect(mockOnClose).toHaveBeenCalled()
        })

        it('should have proper heading hierarchy', () => {
            render(
                <AdminLayout>
                    <div>
                        <h1>Page Title</h1>
                        <h2>Section Title</h2>
                    </div>
                </AdminLayout>
            )

            const headings = screen.getAllByRole('heading')
            expect(headings[0]).toHaveTextContent('Admin Panel')
            expect(headings[1]).toHaveTextContent('Page Title')
            expect(headings[2]).toHaveTextContent('Section Title')
        })
    })
})