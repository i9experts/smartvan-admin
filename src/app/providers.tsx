"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/theme/ThemeContext";
import { SafetyAlertCenter } from "@/components/safety/SafetyAlertCenter";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          {children}
          {/* Live driver safety alerts (SOS, students not dropped, overspeed, van checks) */}
          <SafetyAlertCenter />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
