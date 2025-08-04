import { Lato, Montserrat } from "next/font/google";
import "./globals.css";
import { SupabaseAuthProvider } from "@/components/auth/SupabaseAuthProvider";
import ClientLayout from "../components/ClientLayout";
import FontProvider from "../components/FontProvider";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-montserrat",
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <title>JR Imóveis - Encontre o Imóvel dos Seus Sonhos</title>
        <meta name="description" content="JR Imóveis - Especializada em compra, venda e aluguel de imóveis em Presidente Prudente e Regente Feijó. Encontre casas, apartamentos, terrenos, sítios e fazendas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="robots" content="index, follow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
      </head>
      <body>
        <FontProvider fontClasses={`${lato.variable} ${montserrat.variable} font-sans bg-white text-gray-800`}>
          <SupabaseAuthProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </SupabaseAuthProvider>
        </FontProvider>
      </body>
    </html>
  );
}
