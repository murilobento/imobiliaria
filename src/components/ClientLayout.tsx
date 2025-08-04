'use client';

import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  
  // Simple check - admin pages have their own AdminLayout, so we exclude them
  const isAdminPage = pathname?.startsWith('/admin');

  // For admin pages, just render children (they have their own layout)
  // For other pages, render with Header and Footer
  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}