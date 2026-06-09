import type {Metadata} from 'next';
import { Work_Sans, Inter } from 'next/font/google';
import './globals.css';
import { DeputadoProvider } from '@/context/DeputadoContext';
import { AuthProvider } from '@/context/AuthContext';
import { InactivityHandler } from '@/components/InactivityHandler';

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Chruch Management',
  description: 'Church management system - track ministries, actions, budgets, and records',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${workSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-body bg-background text-on-background bg-subtle-flag min-h-screen antialiased dark:bg-slate-950 dark:text-white" suppressHydrationWarning>
        <AuthProvider>
          <DeputadoProvider>
            <InactivityHandler />
            {children}
          </DeputadoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
