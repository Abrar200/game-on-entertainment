// src/lib/cacheManager.ts
// Enhanced cache management that preserves auth sessions

export class CacheManager {
    private static readonly PROBLEMATIC_KEYS = [
      'supabase-cache',
      'users-cache',
      'profiles-cache',
      'metadata-cache'
    ];
  
    private static readonly PRESERVE_KEYS = [
      'sb-',
      'supabase.auth',
      'auth-token',
      'refresh-token',
      'access-token'
    ];
  
    /**
     * Clear problematic cache while preserving auth
     */
    static clearProblematicCache(): void {
      try {
        const keysToRemove: string[] = [];
        
        // Identify keys to remove from localStorage
        Object.keys(localStorage).forEach(key => {
          const shouldPreserve = this.PRESERVE_KEYS.some(pattern => key.includes(pattern));
          const isProblematic = this.PROBLEMATIC_KEYS.some(pattern => key.includes(pattern));
          
          if (!shouldPreserve && (isProblematic || key.includes('user') || key.includes('profile'))) {
            keysToRemove.push(key);
          }
        });
  
        // Remove identified keys
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log('🧹 Cleared cache:', key);
        });
  
        // Clear sessionStorage (usually safe to clear entirely)
        const sessionKeysToRemove: string[] = [];
        Object.keys(sessionStorage).forEach(key => {
          const shouldPreserve = this.PRESERVE_KEYS.some(pattern => key.includes(pattern));
          if (!shouldPreserve) {
            sessionKeysToRemove.push(key);
          }
        });
  
        sessionKeysToRemove.forEach(key => {
          sessionStorage.removeItem(key);
        });
  
      } catch (error) {
        console.warn('⚠️ Cache clearing not available:', error);
      }
    }
  
    /**
     * Clear browser cache without affecting localStorage
     */
    static async clearBrowserCache(): Promise<void> {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('🧹 Cleared browser cache');
        }
      } catch (error) {
        console.warn('⚠️ Browser cache clearing not available:', error);
      }
    }
  
    /**
     * Smart cache refresh - clears data cache but preserves auth
     */
    static smartRefresh(): void {
      this.clearProblematicCache();
      this.clearBrowserCache();
      
      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent('smartCacheRefresh', {
        detail: { timestamp: Date.now() }
      }));
    }
  
    /**
     * Force refresh user data
     */
    static refreshUserData(): void {
      this.clearProblematicCache();
      
      window.dispatchEvent(new CustomEvent('userDataRefresh', {
        detail: { timestamp: Date.now() }
      }));
    }
  
    /**
     * Auto-clear cache on user operations
     */
    static setupAutoClear(): void {
      if (typeof window === 'undefined') return;
  
      // Override fetch to detect user operations
      const originalFetch = window.fetch;
      
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        
        try {
          const url = args[0]?.toString() || '';
          const method = (args[1] as RequestInit)?.method || 'GET';
          
          // Clear cache on successful user operations
          if (response.ok && (url.includes('/users') || url.includes('/profiles'))) {
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
              // Delay to allow operation to complete
              setTimeout(() => {
                console.log('🔄 Auto-clearing cache after user operation');
                CacheManager.smartRefresh();
              }, 500);
            }
          }
        } catch (error) {
          console.warn('⚠️ Auto-clear detection failed:', error);
        }
        
        return response;
      };
    }
  }
  
  // Auto-setup
  if (typeof window !== 'undefined') {
    CacheManager.setupAutoClear();
  }
  
  // React hooks
  import { useEffect, useCallback } from 'react';
  
  export const useAutoRefresh = (callback: () => void) => {
    const handleRefresh = useCallback(() => {
      console.log('🔄 Auto-refreshing data...');
      callback();
    }, [callback]);
  
    useEffect(() => {
      window.addEventListener('userDataRefresh', handleRefresh);
      window.addEventListener('smartCacheRefresh', handleRefresh);
      
      return () => {
        window.removeEventListener('userDataRefresh', handleRefresh);
        window.removeEventListener('smartCacheRefresh', handleRefresh);
      };
    }, [handleRefresh]);
  };
  
  export const useCacheManager = () => {
    return {
      clearProblematicCache: CacheManager.clearProblematicCache,
      smartRefresh: CacheManager.smartRefresh,
      refreshUserData: CacheManager.refreshUserData
    };
  };