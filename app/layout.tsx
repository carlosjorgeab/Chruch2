import type {Metadata} from 'next';
import './globals.css';
import { IgrejaProvider } from '@/context/IgrejaContext';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Church Management',
  description: 'Church management system',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <IgrejaProvider>
            {children}
          </IgrejaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
