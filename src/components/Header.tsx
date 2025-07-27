import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Bell, Settings, Plus, FileText, Gamepad2, MapPin, Gift, Wrench, AlertTriangle, BookOpen, Download, ChevronDown, Database, Users, Home, BarChart3, History, LogOut, Upload, Map, Mail } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import LogoUpload from './LogoUpload';

interface HeaderProps {
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { setCurrentView, companyLogo, setCompanyLogo, currentView } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const showAlreadyHereMessage = (viewName: string) => {
    toast({
      title: "Already Here",
      description: `You are already in the ${viewName} section.`,
      duration: 2000,
    });
  };

  const handleDashboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'dashboard') {
      showAlreadyHereMessage('Dashboard');
      return;
    }
    navigate('/');
    setCurrentView('dashboard');
  };

  const handleGenerateReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'reports') {
      showAlreadyHereMessage('Reports');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('reports'), 100);
    } else {
      setCurrentView('reports');
    }
  };

  const handleJobs = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'jobs') {
      showAlreadyHereMessage('Jobs');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('jobs'), 100);
    } else {
      setCurrentView('jobs');
    }
  };

  const handleMachines = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'machines') {
      showAlreadyHereMessage('Machines');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('machines'), 100);
    } else {
      setCurrentView('machines');
    }
  };

  const handleVenues = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'venues') {
      showAlreadyHereMessage('Venues');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('venues'), 100);
    } else {
      setCurrentView('venues');
    }
  };

  const handleMap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'map') {
      showAlreadyHereMessage('Map');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('map'), 100);
    } else {
      setCurrentView('map');
    }
  };

  const handlePrizes = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'prizes') {
      showAlreadyHereMessage('Prizes');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('prizes'), 100);
    } else {
      setCurrentView('prizes');
    }
  };

  const handleUsers = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'users') {
      showAlreadyHereMessage('Users');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('users'), 100);
    } else {
      setCurrentView('users');
    }
  };

  const handleStockAnalytics = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'analytics') {
      showAlreadyHereMessage('Stock Analytics');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('analytics'), 100);
    } else {
      setCurrentView('analytics');
    }
  };

  const handleEmailNotifications = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.pathname === '/' && currentView === 'email-notifications') {
      showAlreadyHereMessage('Email Notifications');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setCurrentView('email-notifications'), 100);
    } else {
      setCurrentView('email-notifications');
    }
  };

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLogout();
  };

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
            <Button 
              onClick={handleDashboard}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              type="button"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            
            <Button 
              onClick={handleMap}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              type="button"
            >
              <Map className="h-4 w-4 mr-2" />
              Map
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  type="button"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Manage
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white">
                <DropdownMenuItem onClick={handleMachines}>
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Machines
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleVenues}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Venues
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrizes}>
                  <Gift className="h-4 w-4 mr-2" />
                  Prizes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUsers}>
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStockAnalytics}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stock Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailNotifications}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  type="button"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  App Management
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white p-4 w-80">
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Company Branding</h3>
                  <LogoUpload 
                    onLogoUploaded={setCompanyLogo}
                    currentLogo={companyLogo}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleJobs}
              variant="ghost"
              className="text-white hover:bg-white/20"
              type="button"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Jobs
            </Button>
            
            <Button 
              onClick={handleGenerateReport}
              className="bg-white/20 text-white hover:bg-white/30 font-semibold border border-white/30"
              type="button"
            >
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/20"
              type="button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;