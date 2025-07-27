import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const authData = localStorage.getItem('arcade_manager_auth');
    if (authData) {
      try {
        const userData = JSON.parse(authData);
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('arcade_manager_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .single();

      if (error || !users) {
        toast({
          title: 'Login Failed',
          description: 'Invalid username or password',
          variant: 'destructive'
        });
        return false;
      }

      setCurrentUser(users);
      setIsAuthenticated(true);
      localStorage.setItem('arcade_manager_auth', JSON.stringify(users));
      
      toast({
        title: 'Success',
        description: `Welcome back, ${users.username}!`
      });
      
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Login failed. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('arcade_manager_auth');
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully'
    });
  };

  return {
    isAuthenticated,
    loading,
    currentUser,
    login,
    logout
  };
};