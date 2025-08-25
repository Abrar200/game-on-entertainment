// App.tsx - OPTIMIZED VERSION for faster loading
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
import { useEffect, useState, useRef } from "react";

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

  const [appReady, setAppReady] = useState(false);
  const initializationStarted = useRef(false);

  // OPTIMIZED: Faster app initialization
  useEffect(() => {
    if (initializationStarted.current) {
      return;
    }
    
    initializationStarted.current = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // OPTIMIZED: Minimal delay, just ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 50));
        
        setAppReady(true);
        console.log('✅ App initialized');
        
      } catch (error) {
        console.error('❌ App initialization error:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 App: Login attempt for:', email);
      
      const success = await login(email, password);
      
      if (success) {
        console.log('✅ App: Login successful');
      } else {
        console.log('❌ App: Login failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ App: Login error:', error);
      return false;
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      console.log('👋 App: Logout initiated');
      await logout();
      console.log('✅ App: Logout completed');
    } catch (error) {
      console.error('❌ App: Logout error:', error);
      throw error;
    }
  };

  // OPTIMIZED: Simplified state management
  const shouldShowLoading = !appReady || loading;
  const shouldShowLogin = appReady && !loading && !isAuthenticated;
  const shouldShowMainApp = appReady && !loading && isAuthenticated;

  // Debug logging (simplified)
  console.log('🔍 App render state:', {
    appReady,
    loading,
    isAuthenticated,
    hasUserProfile: !!userProfile,
    shouldShowLoading,
    shouldShowLogin,
    shouldShowMainApp
  });

  // Show loading screen
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!appReady ? 'Initializing application...' : 'Loading your dashboard...'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {loading ? 'Checking authentication...' : 'Please wait...'}
          </p>
        </div>
      </div>
    );
  }

  // Show login form
  if (shouldShowLogin) {
    console.log('🔒 App: Showing login form');
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show main app
  if (shouldShowMainApp) {
    console.log('🏠 App: Showing main app for user:', userProfile?.email);
    
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
  }

  // Fallback - should never reach here
  console.error('❌ App: Reached unexpected state, showing loading...');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-red-600">Unexpected state. Please refresh the page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
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