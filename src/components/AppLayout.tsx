import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
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
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onLogout }) => {
  const { currentView, setCurrentView } = useAppContext();

  const renderCurrentView = () => {
    if (children) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      );
    }
    
    switch (currentView) {
      case 'reports':
      case 'machine-reports':
        return <ReportGenerator />;
      case 'inventory':
        return <InventoryManager />;
      case 'machines':
        return <MachinesManager />;
      case 'venues':
        return <VenuesManager />;
      case 'prizes':
        return <PrizesManager />;
      case 'parts':
        return <PartsManager />;
      case 'download':
        return <CodeDownloader />;
      case 'jobs':
        return <JobsManager />;
      case 'users':
        return <UsersManager />;
      case 'analytics':
        return <StockAnalytics />;
      case 'history':
        return <MachineHistoryManager />;
      case 'map':
        return <VenueMap onClose={() => setCurrentView('dashboard')} />;
      case 'email-notifications':
        return <EmailNotificationManager />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header onLogout={onLogout} />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AppLayout;