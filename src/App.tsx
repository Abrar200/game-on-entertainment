// App.tsx - SIMPLIFIED VERSION
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

  // Enhanced login handler
  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('App: Login attempt for:', email);
      const success = await login(email, password);
      console.log('App: Login result:', success);
      return success;
    } catch (error) {
      console.error('App: Login error:', error);
      return false;
    }
  };

  // Enhanced logout handler
  const handleLogout = async (): Promise<void> => {
    try {
      console.log('App: Logout initiated');
      await logout();
      console.log('App: Logout completed');
    } catch (error) {
      console.error('App: Logout error:', error);
      throw error;
    }
  };

  // Debug current state
  console.log('App render state:', {
    loading,
    isAuthenticated,
    hasUserProfile: !!userProfile,
    userEmail: userProfile?.email
  });

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated or no profile
  if (!isAuthenticated || !userProfile) {
    console.log('App: Showing login form');
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show main app
  console.log('App: Showing main app for user:', userProfile.email);
  
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <Index 
                onLogout={handleLogout} 
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
                  onLogout={handleLogout}
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
                  onLogout={handleLogout}
                  userProfile={userProfile}
                />
              } 
            />
          )}
          <Route 
            path="/editing-guide" 
            element={
              <EditingGuidePage 
                onLogout={handleLogout}
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