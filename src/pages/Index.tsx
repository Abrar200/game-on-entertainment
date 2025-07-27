import React from 'react';
import AppLayout from '@/components/AppLayout';

interface IndexProps {
  onLogout: () => void;
}

const Index: React.FC<IndexProps> = ({ onLogout }) => {
  return (
    <AppLayout onLogout={onLogout} />
  );
};

export default Index;