import './global.css';

export const metadata = {
  title: 'Lyrically — AI Songwriting & YuE2 Prompt Studio',
  description: 'Generate high-fidelity song lyrics, YuE2/Suno audio prompts, viral social captions, and genre tags for any artist style.',
  keywords: ['lyrics generator', 'YuE2', 'Suno AI', 'songwriting AI', 'music producer', 'rap lyrics', 'tags'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
