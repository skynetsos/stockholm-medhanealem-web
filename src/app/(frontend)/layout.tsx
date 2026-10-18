import "@/styles/globals.css";

// Temporary root layout for the public site. Replaced by
// (frontend)/[locale]/layout.tsx with next-intl in Phase 0 task 5.
export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="am">
      <body>{children}</body>
    </html>
  );
}
