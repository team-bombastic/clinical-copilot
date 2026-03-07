import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '@aws-amplify/ui-react/styles.css';
import '../globals.css';

import { routing } from '@/i18n/routing';
import AuthenticatorWrapper from '../../components/authenticator/wrapper';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
	title: 'Clinical Copilot',
	description: 'Dictate or type clinical notes with live transcription',
	icons: {
		icon: '/favicon.png',
	},
	openGraph: {
		title: 'Clinical Copilot',
		description: 'Dictate or type clinical notes with live transcription',
		type: 'website',
		siteName: 'Clinical Copilot',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Clinical Copilot',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Clinical Copilot',
		description: 'Dictate or type clinical notes with live transcription',
		images: ['/og-image.png'],
	},
};

type Props = {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;

	// Ensure that the incoming `locale` is valid
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if (!routing.locales.includes(locale as any)) {
		notFound();
	}

	const messages = await getMessages();

	return (
		<html lang={locale}>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<NextIntlClientProvider messages={messages}>
					<AuthenticatorWrapper>{children}</AuthenticatorWrapper>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
