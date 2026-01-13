import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextDjango";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DataProvider } from "@/contexts/DataContextDjango";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppRouter from "@/components/AppRouter";
import { useEffect } from "react";
import { initTokenCleaner } from "@/lib/tokenCleaner";

const queryClient = new QueryClient();

const App = () => {
  // Initialize token cleaner on app startup
  useEffect(() => {
    initTokenCleaner();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <NotificationProvider>
              <DataProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppRouter />
                  </BrowserRouter>
                </TooltipProvider>
              </DataProvider>
            </NotificationProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
