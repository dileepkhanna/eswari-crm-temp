import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextDjango";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DataProvider } from "@/contexts/DataContextDjango";
import { CustomerProvider } from "@/contexts/CustomerContext";
import { ASECustomerProvider } from "@/contexts/ASECustomerContext";
import { ASELeadProvider } from "@/contexts/ASELeadContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { CompanyAuthBridge } from "@/contexts/CompanyAuthBridge";
import { CompanyBranding } from "@/components/CompanyBranding";
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
          <CompanyProvider>
            <CompanyAuthBridge>
              <AppSettingsProvider>
                <CompanyBranding />
                <NotificationProvider>
                  <DataProvider>
                    <CustomerProvider>
                      <ASECustomerProvider>
                        <ASELeadProvider>
                          <TooltipProvider>
                            <Toaster />
                            <Sonner />
                            <BrowserRouter>
                              <AppRouter />
                            </BrowserRouter>
                          </TooltipProvider>
                        </ASELeadProvider>
                      </ASECustomerProvider>
                    </CustomerProvider>
                  </DataProvider>
                </NotificationProvider>
              </AppSettingsProvider>
            </CompanyAuthBridge>
          </CompanyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
