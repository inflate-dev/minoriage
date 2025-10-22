import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { cookies } from 'next/headers'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Counting System',
  description: 'AI-powered item detection and inventory management system',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}