import type {Metadata} from 'next';
import './globals.css';
import { IgrejaProvider } from '@/context/IgrejaContext';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

export const metadata: Metadata = {
  title: 'Church Management',
  description: 'Church management system',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            <IgrejaProvider>
              {children}
            </IgrejaProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
