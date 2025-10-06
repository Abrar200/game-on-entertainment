import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { 
  Bell, Settings, Plus, FileText, Gamepad2, MapPin, Gift, Wrench, 
  AlertTriangle, BookOpen, Download, ChevronDown, Database, Users, 
  Home, BarChart3, History, LogOut, Upload, Map, Mail, Shield,
  Crown, Eye, User, Loader2, Cog, Truck // Added Truck for equipment hire icon
} from 'lucide-react';
import { Route } from 'lucide-react';


interface HeaderProps {
  onLogout: () => void;
  userProfile?: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  } | null;
  hasPermission: (permission: string) => boolean;
  canAccessView: (view: string) => boolean;
  currentView: string;
  setCurrentView: (view: string) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
  showToast: (message: { title: string; description: string; variant?: string; duration?: number }) => void;
}

const ROLE_ICONS = {
  super_admin: { icon: Crown, color: 'bg-purple-100 text-purple-800' },
  admin: { icon: Shield, color: 'bg-red-100 text-red-800' },
  manager: { icon: Users, color: 'bg-blue-100 text-blue-800' },
  technician: { icon: Wrench, color: 'bg-green-100 text-green-800' },
  viewer: { icon: Eye, color: 'bg-gray-100 text-gray-800' }
};

const Header: React.FC<HeaderProps> = ({ 
  onLogout, 
  userProfile, 
  hasPermission, 
  canAccessView,
  currentView,
  setCurrentView,
  companyLogo,
  setCompanyLogo,
  showToast
}) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const showAlreadyHereMessage = (viewName: string) => {
    showToast({
      title: "Already Here",
      description: `You are already in the ${viewName} section.`,
      duration: 2000,
    });
  };

  const createNavHandler = (view: string, viewName: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!canAccessView(view)) {
      showToast({
        title: "Access Denied",
        description: `You don't have permission to access ${viewName}.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (currentView === view) {
      showAlreadyHereMessage(viewName);
      return;
    }
    
    setCurrentView(view);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoggingOut(true);
    
    try {
      console.log('👋 Logout button clicked, initiating logout...');
      await onLogout();
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      showToast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
      setLoggingOut(false);
    }
    // Note: setLoggingOut(false) is not called on success because 
    // the component will unmount when user is logged out
  };

  // Get user role info for display
  const roleInfo = userProfile ? ROLE_ICONS[userProfile.role as keyof typeof ROLE_ICONS] : null;
  const RoleIcon = roleInfo?.icon || User;

  return (
    <header className="bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Game On Entertainment Logo" 
                className="h-12 w-12 object-contain bg-white/10 rounded-lg p-1"
              />
            ) : (
              <div className="h-12 w-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg 
                  className="h-8 w-8 text-white" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Game On Entertainment</h1>
              <p className="text-red-100 mt-1">Arcade & Claw Machine Management</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* User Info */}
            {userProfile && (
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                <div className={`p-1 rounded-full ${roleInfo?.color || 'bg-gray-100'}`}>
                  <RoleIcon className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <div className="font-medium">
                    {userProfile.full_name || userProfile.username || 'User'}
                  </div>
                  <div className="text-red-200 text-xs capitalize">
                    {userProfile.role.replace('_', ' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard - Always visible */}
            <Button 
              onClick={createNavHandler('dashboard', 'Dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              type="button"
              disabled={loggingOut}
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            
            {/* Equipment Hire - Standalone button */}
            {canAccessView('equipment-hire') && (
              <Button 
                onClick={createNavHandler('equipment-hire', 'Equipment Hire')}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                type="button"
                disabled={loggingOut}
              >
                <Truck className="h-4 w-4 mr-2" />
                Equipment Hire
              </Button>
            )}
            
            {/* Map - Only if user can view venues */}
            {canAccessView('map') && (
              <Button 
                onClick={createNavHandler('map', 'Map')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                type="button"
                disabled={loggingOut}
              >
                <Map className="h-4 w-4 mr-2" />
                Map
              </Button>
            )}
            
            {/* Management Dropdown */}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  type="button"
                  disabled={loggingOut}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Manage
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                {canAccessView('machines') && (
                  <DropdownMenuItem onClick={createNavHandler('machines', 'Machines')}>
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Machines
                  </DropdownMenuItem>
                )}
                {canAccessView('venues') && (
                  <DropdownMenuItem onClick={createNavHandler('venues', 'Venues')}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Venues
                  </DropdownMenuItem>
                )}
                {canAccessView('runs') && (
                  <DropdownMenuItem onClick={createNavHandler('runs', 'Runs')}>
                    <Route className="h-4 w-4 mr-2" />
                    Runs
                  </DropdownMenuItem>
                )}
                {canAccessView('prizes') && (
                  <DropdownMenuItem onClick={createNavHandler('prizes', 'Prizes')}>
                    <Gift className="h-4 w-4 mr-2" />
                    Prizes
                  </DropdownMenuItem>
                )}
                {hasPermission('manage_stock') && canAccessView('parts') && (
                  <DropdownMenuItem onClick={createNavHandler('parts', 'Parts')}>
                    <Cog className="h-4 w-4 mr-2" />
                    Parts
                  </DropdownMenuItem>
                )}
                {(hasPermission('view_financial_reports') || hasPermission('view_earnings')) && (
                  <DropdownMenuItem onClick={createNavHandler('view-reports', 'View Reports')}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Reports
                  </DropdownMenuItem>
                )}
                {canAccessView('users') && (
                  <DropdownMenuItem onClick={createNavHandler('users', 'Users')}>
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </DropdownMenuItem>
                )}
                {canAccessView('analytics') && (
                  <DropdownMenuItem onClick={createNavHandler('analytics', 'Stock Analytics')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Stock Analytics
                  </DropdownMenuItem>
                )}
                {canAccessView('email-notifications') && (
                  <DropdownMenuItem onClick={createNavHandler('email-notifications', 'Email Notifications')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            
            {/* Jobs - Always visible for jobs permission */}
            {canAccessView('jobs') && (
              <Button 
                onClick={createNavHandler('jobs', 'Jobs')}
                variant="ghost"
                className="text-white hover:bg-white/20"
                type="button"
                disabled={loggingOut}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Jobs
              </Button>
            )}
            
            {/* Reports - Role-dependent access */}
            {(hasPermission('view_financial_reports') || hasPermission('edit_machine_reports')) && (
              <Button 
                onClick={createNavHandler('reports', 'Reports')}
                className="bg-white/20 text-white hover:bg-white/30 font-semibold border border-white/30"
                type="button"
                disabled={loggingOut}
              >
                <FileText className="h-4 w-4 mr-2" />
                Reports
                {hasPermission('edit_machine_reports') && !hasPermission('view_financial_reports') && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Maintenance Only
                  </Badge>
                )}
              </Button>
            )}
            
            {/* Logout */}
            <Button 
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/20"
              type="button"
              disabled={loggingOut}
            >
              {loggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Role-based information bar */}
        {userProfile && (
          <div className="mt-2 text-sm text-red-100">
            <span className="opacity-75">
              Logged in as {userProfile.role.replace('_', ' ').toLowerCase()} • 
              {userProfile.role === 'technician' && ' You can manage jobs and create maintenance reports'}
              {userProfile.role === 'viewer' && ' You have read-only access to system information'}
              {userProfile.role === 'manager' && ' You can manage operations and view earnings'}
              {userProfile.role === 'admin' && ' You have full operational access'}
              {userProfile.role === 'super_admin' && ' You have complete system access'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;