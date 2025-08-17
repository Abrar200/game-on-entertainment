// App.tsx - Enhanced with better authentication flow
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
import { useEffect, useState } from "react";
import { CacheManager } from "@/lib/cacheManager";

const queryClient = new QueryClient();

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

  // Initialize app and handle authentication state changes
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Clear any problematic cache on app start
        CacheManager.clearProblematicCache();
        
        // Wait for auth to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (mounted) {
          setAppReady(true);
          console.log('✅ App initialized');
        }
      } catch (error) {
        console.error('❌ App initialization error:', error);
        if (mounted) {
          setAppReady(true); // Still show the app even if cache clearing fails
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Enhanced login handler with better state management
  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 App: Login attempt for:', email);
      
      const success = await login(email, password);
      
      if (success) {
        console.log('✅ App: Login successful');
        // Clear cache to ensure fresh data after a short delay
        setTimeout(() => {
          CacheManager.smartRefresh();
        }, 1000);
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
      
      // Clear all user-related cache after logout
      setTimeout(() => {
        CacheManager.smartRefresh();
      }, 500);
      
      console.log('✅ App: Logout completed');
    } catch (error) {
      console.error('❌ App: Logout error:', error);
      throw error;
    }
  };

  // Show loading screen while app initializes or auth is loading
  if (!appReady || loading) {
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

  // Debug logging for authentication state
  console.log('🔍 App render - isAuthenticated:', isAuthenticated, 'userProfile:', !!userProfile, 'loading:', loading);

  // Show login form if not authenticated
  if (!isAuthenticated || !userProfile) {
    console.log('🔒 App: Showing login form');
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show main app if authenticated
  console.log('🏠 App: Showing main app for user:', userProfile.email);
  
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