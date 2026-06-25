import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aladdin – AI Investment Research Agent',
  description:
    'Graham-style investment analysis powered by AI. Get detailed research reports with Margin of Safety calculations, Mr. Market sentiment, and clear Invest/Pass decisions.',
  keywords: ['investment research', 'AI agent', 'Benjamin Graham', 'value investing', 'stock analysis'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Aladin&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
