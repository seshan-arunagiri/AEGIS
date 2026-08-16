"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin client-side wrapper around next-themes ThemeProvider.
 * Placed in components/ so the Server Component layout.tsx can import it
 * without triggering "use client" on the whole layout.
 *
 * attribute="class" → next-themes adds/removes "dark" on <html>.
 * defaultTheme="dark" → matches the app's existing dark-first design.
 * enableSystem={false} → we own the toggle, don't follow OS preference.
 * storageKey="aegis-theme" → localStorage key for persistence between reloads.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="aegis-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
