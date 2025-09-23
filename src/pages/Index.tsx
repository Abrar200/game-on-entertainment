// src/pages/Index.tsx - Updated with new props
import React from 'react';
import AppLayout from '@/components/AppLayout';
import EquipmentHireManager from '@/components/EquipmentHireManager';

interface IndexProps {
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

const Index: React.FC<IndexProps> = ({ onLogout, userProfile, hasPermission, canAccessView }) => {
  return (
    <AppLayout 
      onLogout={onLogout}
      userProfile={userProfile}
      hasPermission={hasPermission}
      canAccessView={canAccessView}
    />
  );
};

export default Index;

// ---

// src/pages/Reports.tsx - Add these props to your existing file
interface ReportsProps {
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
  hasPermission: (permission: string) => boolean;
}

// Update your Reports component to accept these props
// const Reports: React.FC<ReportsProps> = ({ onLogout, userProfile, hasPermission }) => {

// ---

// src/pages/PayoutIssues.tsx - Add these props to your existing file
interface PayoutIssuesPageProps {
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
}

// Update your PayoutIssuesPage component to accept these props
// const PayoutIssuesPage: React.FC<PayoutIssuesPageProps> = ({ onLogout, userProfile }) => {

// ---

// src/pages/EditingGuide.tsx - Add these props to your existing file
interface EditingGuidePageProps {
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
}

// Update your EditingGuidePage component to accept these props
// const EditingGuidePage: React.FC<EditingGuidePageProps> = ({ onLogout, userProfile }) => {

// ---

// Component interface updates you need to make:

// src/components/ReportGenerator.tsx - Add this prop (optional)
interface ReportGeneratorProps {
  restrictedMode?: 'maintenance_only' | 'manager' | undefined;
}

// src/components/MachinesManager.tsx - Add this prop (optional)
interface MachinesManagerProps {
  readOnly?: boolean;
}

// src/components/VenuesManager.tsx - Add this prop (optional)  
interface VenuesManagerProps {
  readOnly?: boolean;
}

// src/components/PrizesManager.tsx - Add this prop (optional)
interface PrizesManagerProps {
  readOnly?: boolean;
}

// src/components/JobsManager.tsx - Add these props (optional)
interface JobsManagerProps {
  userRole?: string;
  hasPermission?: (permission: string) => boolean;
}

// src/components/UsersManager.tsx - Add these props (optional)
interface UsersManagerProps {
  currentUserRole?: string;
  hasPermission?: (permission: string) => boolean;
}

// src/components/Dashboard.tsx - Add these props (optional)
interface DashboardProps {
  userProfile?: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
  hasPermission?: (permission: string) => boolean;
}

// src/components/VenueMap.tsx - Add this prop (optional)
interface VenueMapProps {
  onClose?: () => void;
}