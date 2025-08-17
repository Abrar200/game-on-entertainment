import React from 'react';
import ReportsContent from '@/components/ReportsContent';

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

const Reports: React.FC<ReportsProps> = ({ onLogout, userProfile, hasPermission }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <ReportsContent />
      </div>
    </div>
  );
};

export default Reports;