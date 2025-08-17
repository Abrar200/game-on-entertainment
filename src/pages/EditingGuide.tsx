import EditingGuide from '@/components/EditingGuide';
import AppLayout from '@/components/AppLayout';

interface EditingGuidePageProps {
  onLogout: () => void;
  userProfile: {
    role: string;
    username?: string;
    full_name?: string;
    email: string;
  };
}

const EditingGuidePage: React.FC<EditingGuidePageProps> = ({ onLogout, userProfile }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        
      </div>
    </div>
  );
}

export default EditingGuidePage;