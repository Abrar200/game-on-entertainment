// App.tsx - PRODUCTION OPTIMIZED VERSION
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
import { checkSupabaseConnection } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Function to wait for Supabase connection
const waitForSupabaseConnection = async (maxAttempts = 3, delay = 1000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { healthy } = await checkSupabaseConnection();
      if (healthy) {
        console.log(`✅ Supabase connection established on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Connection attempt ${attempt} failed:`, error);
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error('❌ Failed to establish Supabase connection');
  return false;
};

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
  const isProduction = window.location.hostname !== 'localhost';

  // CRITICAL: Production-optimized app initialization
  useEffect(() => {
    setAppReady(true); // Just mark as ready immediately
  }, []);

  // Enhanced login handler with better error handling
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

  // Enhanced logout handler
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

  // CRITICAL: Better loading state management
  const shouldShowLoading = !appReady || (loading && !isProduction);
  const shouldShowLogin = appReady && !loading && (!isAuthenticated || !userProfile);
  const shouldShowMainApp = appReady && (isAuthenticated && userProfile);

  // Debug logging
  console.log('🔍 App render state:', {
    appReady,
    loading,
    isAuthenticated,
    hasUserProfile: !!userProfile,
    shouldShowLoading,
    shouldShowLogin,
    shouldShowMainApp,
    isProduction
  });

  // Show production-specific loading screen
  if (shouldShowLoading && isProduction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Connecting to database...
          </p>
          <p className="mt-2 text-sm text-gray-500">
            This may take a moment on first load
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Show regular loading screen
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
                  userProfile={userProfile!}
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
                    userProfile={userProfile!}
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
                    userProfile={userProfile!}
                  />
                } 
              />
            )}
            <Route 
              path="/editing-guide" 
              element={
                <EditingGuidePage 
                  onLogout={handleLogout}
                  userProfile={userProfile!}
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