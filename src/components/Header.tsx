import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  FileText, Gamepad2, MapPin, Gift, Wrench,
  ChevronDown, Database, Users,
  Home, BarChart3, LogOut, Map, Mail, Shield,
  Crown, Eye, User, Loader2, Cog, Truck, CalendarDays,
  Route, Package
} from 'lucide-react';

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

const ROLE_CONFIG = {
  super_admin: { icon: Crown,  color: 'bg-purple-500', label: 'Super Admin' },
  admin:       { icon: Shield, color: 'bg-red-400',    label: 'Admin' },
  manager:     { icon: Users,  color: 'bg-blue-500',   label: 'Manager' },
  technician:  { icon: Wrench, color: 'bg-green-500',  label: 'Technician' },
  viewer:      { icon: Eye,    color: 'bg-gray-400',   label: 'Viewer' },
};

const Header: React.FC<HeaderProps> = ({
  onLogout, userProfile, hasPermission, canAccessView,
  currentView, setCurrentView, companyLogo, showToast,
}) => {
  const [loggingOut, setLoggingOut] = useState(false);

  // requiresAccess=false bypasses canAccessView check (for calendar, moves)
  const nav = (view: string, name: string, requiresAccess = true) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requiresAccess && !canAccessView(view)) {
      showToast({ title: 'Access Denied', description: `You don't have permission to access ${name}.`, variant: 'destructive', duration: 3000 });
      return;
    }
    if (currentView === view) return;
    setCurrentView(view);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoggingOut(true);
    try { await onLogout(); } catch {
      showToast({ title: 'Error', description: 'Failed to logout. Please try again.', variant: 'destructive' });
      setLoggingOut(false);
    }
  };

  const roleInfo = userProfile ? ROLE_CONFIG[userProfile.role as keyof typeof ROLE_CONFIG] : null;
  const RoleIcon = roleInfo?.icon || User;
  const displayName = userProfile?.full_name || userProfile?.username || 'User';

  const active = (view: string | string[]) => {
    const views = Array.isArray(view) ? view : [view];
    return views.includes(currentView)
      ? 'bg-white/25 text-white font-semibold'
      : 'text-white/85 hover:bg-white/15 hover:text-white';
  };

  return (
    <header className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white shadow-xl">
      <div className="container mx-auto px-4">

        {/* Row 1: Brand + user + logout */}
        <div className="flex items-center justify-between py-2.5 border-b border-white/15">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="h-9 w-9 object-contain bg-white/10 rounded-lg p-1" />
            ) : (
              <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold leading-tight">Game On Entertainment</h1>
              <p className="text-red-200 text-xs">Arcade & Claw Machine Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userProfile && (
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                <div className={`w-5 h-5 rounded-full ${roleInfo?.color || 'bg-gray-400'} flex items-center justify-center shrink-0`}>
                  <RoleIcon className="h-3 w-3 text-white" />
                </div>
                <div className="leading-tight hidden sm:block">
                  <p className="font-semibold text-sm">{displayName}</p>
                  <p className="text-red-200 text-xs">{roleInfo?.label || userProfile.role}</p>
                </div>
              </div>
            )}
            <Button onClick={handleLogout} disabled={loggingOut} size="sm" variant="ghost"
              className="text-white/85 hover:bg-white/15 hover:text-white gap-1.5 text-sm">
              {loggingOut
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Logging out…</>
                : <><LogOut className="h-3.5 w-3.5" />Logout</>}
            </Button>
          </div>
        </div>

        {/* Row 2: Nav links */}
        <nav className="flex items-center gap-0.5 py-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>

          <Button onClick={nav('dashboard', 'Dashboard')} size="sm" variant="ghost"
            className={`shrink-0 gap-1.5 text-sm ${active('dashboard')}`} disabled={loggingOut}>
            <Home className="h-3.5 w-3.5" />Dashboard
          </Button>

          {/* Manage dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={loggingOut}
                className={`shrink-0 gap-1.5 text-sm ${active(['machines','venues','prizes','parts','runs','analytics','users','email-notifications'])}`}>
                <Database className="h-3.5 w-3.5" />Manage<ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white min-w-[175px]">
              {canAccessView('machines') && (
                <DropdownMenuItem onClick={nav('machines','Machines')}>
                  <Gamepad2 className="h-4 w-4 mr-2 text-gray-500" />Machines
                </DropdownMenuItem>
              )}
              {canAccessView('venues') && (
                <DropdownMenuItem onClick={nav('venues','Venues')}>
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />Venues
                </DropdownMenuItem>
              )}
              {canAccessView('runs') && (
                <DropdownMenuItem onClick={nav('runs','Runs')}>
                  <Route className="h-4 w-4 mr-2 text-gray-500" />Runs
                </DropdownMenuItem>
              )}
              {canAccessView('prizes') && (
                <DropdownMenuItem onClick={nav('prizes','Prizes')}>
                  <Gift className="h-4 w-4 mr-2 text-gray-500" />Prizes
                </DropdownMenuItem>
              )}
              {hasPermission('manage_stock') && canAccessView('parts') && (
                <DropdownMenuItem onClick={nav('parts','Parts')}>
                  <Cog className="h-4 w-4 mr-2 text-gray-500" />Parts
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canAccessView('analytics') && (
                <DropdownMenuItem onClick={nav('analytics','Analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2 text-gray-500" />Stock Analytics
                </DropdownMenuItem>
              )}
              {canAccessView('users') && (
                <DropdownMenuItem onClick={nav('users','Users')}>
                  <Users className="h-4 w-4 mr-2 text-gray-500" />Users
                </DropdownMenuItem>
              )}
              {canAccessView('email-notifications') && (
                <DropdownMenuItem onClick={nav('email-notifications','Email Notifications')}>
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />Email Notifications
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canAccessView('jobs') && (
            <Button onClick={nav('jobs','Jobs')} size="sm" variant="ghost" disabled={loggingOut}
              className={`shrink-0 gap-1.5 text-sm ${active('jobs')}`}>
              <Wrench className="h-3.5 w-3.5" />Jobs
            </Button>
          )}

          {/* Calendar — no access check needed, open to all */}
          <Button onClick={nav('calendar','Calendar',false)} size="sm" variant="ghost" disabled={loggingOut}
            className={`shrink-0 gap-1.5 text-sm ${active('calendar')}`}>
            <CalendarDays className="h-3.5 w-3.5" />Calendar
          </Button>

          {/* Moves — no access check needed */}
          <Button onClick={nav('machine-moves','Machine Moves',false)} size="sm" variant="ghost" disabled={loggingOut}
            className={`shrink-0 gap-1.5 text-sm ${active('machine-moves')}`}>
            <Truck className="h-3.5 w-3.5" />Moves
          </Button>

          {canAccessView('map') && (
            <Button onClick={nav('map','Map')} size="sm" variant="ghost" disabled={loggingOut}
              className={`shrink-0 gap-1.5 text-sm ${active('map')}`}>
              <Map className="h-3.5 w-3.5" />Map
            </Button>
          )}

          {canAccessView('equipment-hire') && (
            <Button onClick={nav('equipment-hire','Equipment Hire')} size="sm" variant="ghost" disabled={loggingOut}
              className={`shrink-0 gap-1.5 text-sm ${active('equipment-hire')}`}>
              <Package className="h-3.5 w-3.5" />Hire
            </Button>
          )}

          <div className="h-4 w-px bg-white/20 mx-1 shrink-0" />

          {(hasPermission('view_financial_reports') || hasPermission('edit_machine_reports')) && (
            <Button onClick={nav('reports','Reports')} size="sm" variant="ghost" disabled={loggingOut}
              className={`shrink-0 gap-1.5 text-sm ${active(['reports','machine-reports'])}`}>
              <FileText className="h-3.5 w-3.5" />Reports
            </Button>
          )}

          {(hasPermission('view_financial_reports') || hasPermission('view_earnings')) && (
            <Button onClick={nav('view-reports','View Reports')} size="sm" variant="ghost" disabled={loggingOut}
              className={`shrink-0 gap-1.5 text-sm ${active('view-reports')}`}>
              <BarChart3 className="h-3.5 w-3.5" />View Reports
            </Button>
          )}

        </nav>
      </div>
    </header>
  );
};

export default Header;