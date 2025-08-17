import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import your existing components
import InventoryManager from './InventoryManager';
import ReportGenerator from './ReportGenerator';
import Dashboard from './Dashboard';
import Header from './Header';
import MachinesManager from './MachinesManager';
import VenuesManager from './VenuesManager';
import PrizesManager from './PrizesManager';
import PartsManager from './PartsManager';
import CodeDownloader from './CodeDownloader';
import JobsManager from './JobsManager';
import UsersManager from './UsersManager';
import StockAnalytics from './StockAnalytics';
import MachineHistoryManager from './MachineHistoryManager';
import VenueMap from './VenueMap';
import EmailNotificationManager from './EmailNotificationManager';

interface AppLayoutProps {
  children?: React.ReactNode;
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
  hasPermission: (permission: string) => boolean;
  canAccessView: (view: string) => boolean;
}

// Access denied component
const AccessDenied: React.FC<{ 
  viewName: string; 
  userRole: string; 
  onBackToDashboard: () => void;
}> = ({ viewName, userRole, onBackToDashboard }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Card className="max-w-md w-full">
      <CardContent className="p-8 text-center">
        <div className="mb-4">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-4">
          Your role (<span className="font-medium capitalize">{userRole.replace('_', ' ')}</span>) 
          does not have permission to access <span className="font-medium">{viewName}</span>.
        </p>
        <Button onClick={onBackToDashboard} className="w-full">
          Return to Dashboard
        </Button>
      </CardContent>
    </Card>
  </div>
);

// Role-based reports component
const RoleBasedReports: React.FC<{ 
  userProfile: { role: string };
  hasPermission: (permission: string) => boolean;
}> = ({ userProfile, hasPermission }) => {
  // For technicians, show a simplified report interface
  if (userProfile.role === 'technician') {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Maintenance Reports
          </h2>
          <p className="text-blue-700 text-sm">
            As a technician, you can create and view maintenance reports for machines you service.
          </p>
        </div>
        <ReportGenerator restrictedMode="maintenance_only" />
      </div>
    );
  }

  // For managers, hide sensitive financial data editing
  if (userProfile.role === 'manager') {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Management Reports
          </h2>
          <p className="text-yellow-700 text-sm">
            You can view earnings and operational reports but cannot edit financial data.
          </p>
        </div>
        <ReportGenerator restrictedMode="manager" />
      </div>
    );
  }

  // Full access for admins and super admins
  return <ReportGenerator />;
};

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  onLogout, 
  userProfile, 
  hasPermission, 
  canAccessView 
}) => {
  const { currentView, setCurrentView, companyLogo, setCompanyLogo } = useAppContext();

  const showToast = (message: { title: string; description: string; variant?: string; duration?: number }) => {
    // This would normally use your toast hook
    console.log('Toast:', message);
  };

  const renderCurrentView = () => {
    if (children) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      );
    }
    
    // Check access for each view
    switch (currentView) {
      case 'reports':
      case 'machine-reports':
        if (!canAccessView('reports')) {
          return (
            <AccessDenied 
              viewName="Reports" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <RoleBasedReports userProfile={userProfile} hasPermission={hasPermission} />;
        
      case 'inventory':
        if (!canAccessView('prizes')) {
          return (
            <AccessDenied 
              viewName="Inventory" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <InventoryManager />;
        
      case 'machines':
        if (!canAccessView('machines')) {
          return (
            <AccessDenied 
              viewName="Machines" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <MachinesManager readOnly={!hasPermission('manage_machines')} />;
        
      case 'venues':
        if (!canAccessView('venues')) {
          return (
            <AccessDenied 
              viewName="Venues" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <VenuesManager readOnly={!hasPermission('manage_venues')} />;
        
      case 'prizes':
        if (!canAccessView('prizes')) {
          return (
            <AccessDenied 
              viewName="Prizes" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <PrizesManager readOnly={!hasPermission('manage_prizes')} />;
        
      case 'parts':
        if (!hasPermission('manage_stock')) {
          return (
            <AccessDenied 
              viewName="Parts" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <PartsManager />;
        
      case 'download':
        if (!hasPermission('manage_settings')) {
          return (
            <AccessDenied 
              viewName="Downloads" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <CodeDownloader />;
        
      case 'jobs':
        if (!canAccessView('jobs')) {
          return (
            <AccessDenied 
              viewName="Jobs" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <JobsManager userRole={userProfile.role} hasPermission={hasPermission} />;
        
      case 'users':
        if (!canAccessView('users')) {
          return (
            <AccessDenied 
              viewName="User Management" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <UsersManager currentUserRole={userProfile.role} hasPermission={hasPermission} />;
        
      case 'analytics':
        if (!canAccessView('analytics')) {
          return (
            <AccessDenied 
              viewName="Analytics" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <StockAnalytics />;
        
      case 'history':
        if (!canAccessView('machines')) {
          return (
            <AccessDenied 
              viewName="Machine History" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <MachineHistoryManager />;
        
      case 'map':
        if (!canAccessView('map')) {
          return (
            <AccessDenied 
              viewName="Map" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <VenueMap onClose={() => setCurrentView('dashboard')} />;
        
      case 'email-notifications':
        if (!canAccessView('email-notifications')) {
          return (
            <AccessDenied 
              viewName="Email Notifications" 
              userRole={userProfile.role}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          );
        }
        return <EmailNotificationManager />;
        
      case 'dashboard':
      default:
        return <Dashboard userProfile={userProfile} hasPermission={hasPermission} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header 
        onLogout={onLogout}
        userProfile={userProfile}
        hasPermission={hasPermission}
        canAccessView={canAccessView}
        currentView={currentView}
        setCurrentView={setCurrentView}
        companyLogo={companyLogo}
        setCompanyLogo={setCompanyLogo}
        showToast={showToast}
      />
      <main className="container mx-auto px-4 py-8">
        {/* Role-based welcome message */}
        {currentView === 'dashboard' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome back, {userProfile.full_name || userProfile.username}!
            </h2>
            <p className="text-gray-600">
              {userProfile.role === 'technician' && 
                "You have access to job management and machine maintenance features."
              }
              {userProfile.role === 'manager' && 
                "You can manage operations and view business metrics."
              }
              {userProfile.role === 'admin' && 
                "You have full operational access to the system."
              }
              {userProfile.role === 'super_admin' && 
                "You have complete system access including user management."
              }
              {userProfile.role === 'viewer' && 
                "You have read-only access to system information."
              }
            </p>
          </div>
        )}
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AppLayout;