import EditingGuide from '@/components/EditingGuide';
import AppLayout from '@/components/AppLayout';

// LOGIN FEATURE TEMPORARILY REMOVED
// Previous implementation received onLogout prop and passed it to AppLayout

export default function EditingGuidePage() {
  return (
    <AppLayout>
      <EditingGuide />
    </AppLayout>
  );
}