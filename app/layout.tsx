import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Protected from "@/widgets/session-gate";
import { QueryProvider } from "@/shared/lib/QueryClientProvider";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	display: "swap",
});

const instrumentSerif = Instrument_Serif({
	variable: "--font-serif",
	subsets: ["latin"],
	weight: "400",
	style: ["normal", "italic"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "Ovlox",
	description: "Created by Siddha",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`dark ${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
			suppressHydrationWarning
		>
			<body className="antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					forcedTheme="dark"
					disableTransitionOnChange
				>
					<QueryProvider>
						<Protected>{children}</Protected>
						<Toaster />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
