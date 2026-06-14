import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'Igreja Presbiteriana Renovada de Brazlândia - Painel',
  description: 'Sistema de gestão de membros e emissão de carteirinhas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const htmlProps = {
    lang: "pt-BR",
    className: `${inter.variable} ${jetbrainsMono.variable}`,
    suppressHydrationWarning: true,
    "foxified": ""
  };

  return (
    <html {...htmlProps}>
      <body className="font-sans antialiased bg-gray-50 text-slate-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
