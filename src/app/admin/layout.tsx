import { AdminLayout } from '@/components/admin/Layout/AdminLayout'
import { QueryProvider } from '@/components/admin/Common/QueryProvider'
import { AdminComponentPreloader } from '@/components/admin/LazyComponents'
import { ErrorProvider } from '@/components/admin/Common/ErrorProvider'

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorProvider>
      <QueryProvider>
        <AdminComponentPreloader />
        <AdminLayout>{children}</AdminLayout>
      </QueryProvider>
    </ErrorProvider>
  )
}