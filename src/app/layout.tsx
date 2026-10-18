import type { ReactNode } from "react";

/**
 * Pass-through root layout. The real root layouts are (frontend)/[locale]/layout.tsx (public site,
 * renders <html lang>) and (payload)/layout.tsx (admin). This file only exists so Next.js renders the
 * localized [locale]/not-found.tsx inside its layout in production, instead of a bare error shell.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
