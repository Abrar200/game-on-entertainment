import React from 'react';
import PayoutIssues from '@/components/PayoutIssues';

interface PayoutIssuesPageProps {
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
}

const PayoutIssuesPage: React.FC<PayoutIssuesPageProps> = ({ onLogout, userProfile }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <PayoutIssues />
      </div>
    </div>
  );
};

export default PayoutIssuesPage;