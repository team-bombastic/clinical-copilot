import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@aws-amplify/ui-react/styles.css';
import './globals.css';

import AuthenticatorWrapper from '../components/authenticator/wrapper';
import LocaleProvider from '../components/locale-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Clinical Copilot',
  description: 'AI-powered clinical documentation assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocaleProvider>
          <AuthenticatorWrapper>{children}</AuthenticatorWrapper>
        </LocaleProvider>
      </body>
    </html>
  );
}
