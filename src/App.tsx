import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import LoginForm from "@/components/LoginForm";
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import PayoutIssuesPage from "./pages/PayoutIssues";
import EditingGuidePage from "./pages/EditingGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index onLogout={logout} />} />
          <Route path="/reports" element={<Reports onLogout={logout} />} />
          <Route path="/payout-issues" element={<PayoutIssuesPage onLogout={logout} />} />
          <Route path="/editing-guide" element={<EditingGuidePage onLogout={logout} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;