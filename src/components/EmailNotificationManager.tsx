import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface EmailNotification {
  id: string;
  email: string;
  type: string;
  created_at: string;
}

const EmailNotificationManager: React.FC = () => {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; email?: EmailNotification }>({ isOpen: false });
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('type', 'job_notification')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email addresses',
        variant: 'destructive'
      });
    }
  };

  const addEmail = async () => {
    if (!newEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert([{
          email: newEmail.trim(),
          type: 'job_notification'
        }]);

      if (error) throw error;

      setNewEmail('');
      fetchEmails();
      toast({
        title: 'Success',
        description: 'Email address added successfully'
      });
    } catch (error) {
      console.error('Error adding email:', error);
      toast({
        title: 'Error',
        description: 'Failed to add email address',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEmail = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('email_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchEmails();
      toast({
        title: 'Success',
        description: 'Email address removed successfully'
      });
    } catch (error) {
      console.error('Error deleting email:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove email address',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Job Notification Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email address"
                onKeyPress={(e) => e.key === 'Enter' && addEmail()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addEmail} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Email Addresses</Label>
            {emails.length === 0 ? (
              <p className="text-gray-500 text-sm">No email addresses configured</p>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{email.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ isOpen: true, email })}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false })}
        onConfirm={() => {
          if (deleteDialog.email) {
            deleteEmail(deleteDialog.email.id);
          }
          setDeleteDialog({ isOpen: false });
        }}
        title="Remove Email Address"
        description={`Are you sure you want to remove "${deleteDialog.email?.email}" from job notifications?`}
        itemType="email address"
        itemName={deleteDialog.email?.email || ''}
      />
    </div>
  );
};

export default EmailNotificationManager;