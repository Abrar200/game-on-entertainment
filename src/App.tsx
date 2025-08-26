// App.tsx - OPTIMIZED VERSION
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
    },
  },
});

const AppContent = () => {
  const { 
    isAuthenticated, 
    loading, 
    login, 
    logout, 
    userProfile, 
    hasPermission, 
    canAccessView 
  } = useAuth();

  // SIMPLIFIED: Better loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !userProfile) {
    return <LoginForm onLogin={login} />;
  }

  // Show main app
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <Index 
                onLogout={logout} 
                userProfile={userProfile}
                hasPermission={hasPermission}
                canAccessView={canAccessView}
              />
            } 
          />
          {canAccessView('reports') && (
            <Route 
              path="/reports" 
              element={
                <Reports 
                  onLogout={logout}
                  userProfile={userProfile}
                  hasPermission={hasPermission}
                />
              } 
            />
          )}
          {hasPermission('view_analytics') && (
            <Route 
              path="/payout-issues" 
              element={
                <PayoutIssuesPage 
                  onLogout={logout}
                  userProfile={userProfile}
                />
              } 
            />
          )}
          <Route 
            path="/editing-guide" 
            element={
              <EditingGuidePage 
                onLogout={logout}
                userProfile={userProfile}
              />
            } 
          />
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