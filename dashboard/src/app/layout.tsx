import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { QueryProvider } from '@/lib/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnimalDot Dashboard',
  description: 'Smart animal bed monitoring',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
