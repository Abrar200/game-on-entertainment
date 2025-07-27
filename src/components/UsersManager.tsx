import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import UserForm from './UserForm';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  created_at: string;
}

const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deleteUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeleteUser(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Users Management
        </h2>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {showAddForm ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {showAddForm && (
        <UserForm onUserAdded={() => { fetchUsers(); setShowAddForm(false); }} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const displayName = user.full_name || user.username || 'N/A';
                  const email = user.email || 'N/A';
                  const role = user.role || 'user';
                  const isActive = user.is_active !== false;
                  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{displayName}</TableCell>
                      <TableCell>{email}</TableCell>
                      <TableCell>
                        <Badge variant={role.toLowerCase() === 'admin' ? 'default' : 'secondary'}>
                          {role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'destructive'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{createdAt}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteUser(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteUser?.full_name || deleteUser?.username || 'Unknown'}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default UsersManager;