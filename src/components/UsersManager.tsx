import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Users, Plus, Search, Shield, Crown, Eye, Wrench, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseAdmin } from '@/lib/supabase';
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
  deleting?: boolean;
}

interface UsersManagerProps {
  currentUserRole: string;
  hasPermission: (permission: string) => boolean;
}

const ROLE_CONFIGS = {
  super_admin: {
    name: 'Super Admin',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800',
    description: 'Complete system access'
  },
  admin: {
    name: 'Admin',
    icon: Shield,
    color: 'bg-red-100 text-red-800',
    description: 'Full operational access'
  },
  manager: {
    name: 'Manager',
    icon: Users,
    color: 'bg-blue-100 text-blue-800',
    description: 'Operations management'
  },
  technician: {
    name: 'Technician',
    icon: Wrench,
    color: 'bg-green-100 text-green-800',
    description: 'Field maintenance'
  },
  viewer: {
    name: 'Viewer',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800',
    description: 'Read-only access'
  }
};

const UsersManager: React.FC<UsersManagerProps> = ({ currentUserRole, hasPermission }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const canManageUsers = hasPermission('manage_users');
  const canViewUsers = hasPermission('view_users');

  useEffect(() => {
    if (canViewUsers) {
      fetchAllUsers();
    }
  }, [canViewUsers]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchAllUsers = async () => {
    try {
      console.log('🔍 Fetching all users...');

      // Use regular supabase client for reading data (respects RLS)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }

      console.log('✅ Fetched', data?.length || 0, 'users');
      setUsers(data || []);

    } catch (error: any) {
      console.error('❌ Error fetching users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.is_active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!canManageUsers) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to modify users",
        variant: "destructive"
      });
      return;
    }

    const newStatus = !user.is_active;
    
    // Optimistic update
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === user.id ? { ...u, is_active: newStatus } : u
      )
    );

    try {
      // Use admin client for updating user status to bypass RLS
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });

    } catch (error: any) {
      console.error('❌ Error updating user status:', error);
      
      // Revert optimistic update
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id ? { ...u, is_active: user.is_active } : u
        )
      );

      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser || !canManageUsers) return;

    const userToDelete = deleteUser;

    // Optimistic update - mark as deleting
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userToDelete.id ? { ...u, deleting: true } : u
      )
    );

    try {
      console.log('🗑️ Deleting user:', userToDelete.email, 'ID:', userToDelete.id);

      // Step 1: Delete from profile table using ADMIN CLIENT
      console.log('📝 Deleting user profile...');
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) {
        console.error('❌ Profile deletion error:', profileError);
        // Continue anyway to try auth deletion
      } else {
        console.log('✅ Profile deleted successfully');
      }

      // Step 2: Delete from Supabase Auth using ADMIN CLIENT
      console.log('🔐 Deleting auth user...');
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        userToDelete.id
      );

      if (authError) {
        console.error('❌ Auth deletion error:', authError);
        
        // If profile was deleted but auth failed, that's still partial success
        if (!profileError) {
          console.log('⚠️ Profile was deleted but auth deletion failed');
          
          // Remove from state anyway since profile is gone
          setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
          
          toast({
            title: "Partial Success",
            description: "User profile deleted successfully. Auth record may need manual cleanup.",
            variant: "default",
          });
          return;
        } else {
          throw new Error(`Both profile and auth deletion failed: ${authError.message}`);
        }
      } else {
        console.log('✅ Auth user deleted successfully');
      }

      // Complete success - remove from state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      
      toast({
        title: "Success",
        description: `User ${userToDelete.username || userToDelete.email} deleted successfully`,
      });

    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      
      // Revert optimistic update
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userToDelete.id ? { ...u, deleting: false } : u
        )
      );

      let errorMessage = 'Failed to delete user. Please try again.';
      if (error.message.includes('User not allowed')) {
        errorMessage = 'You do not have permission to delete users.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteUser(null);
    }
  };

  const cleanupOrphanedRecords = async () => {
    if (!canManageUsers) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to perform cleanup operations",
        variant: "destructive"
      });
      return;
    }
  
    try {
      console.log('🧹 Starting cleanup of orphaned records...');
      
      // Get all users from the database
      const { data: dbUsers, error: dbError } = await supabaseAdmin
        .from('users')
        .select('id, email');
  
      if (dbError) {
        console.error('❌ Error fetching database users:', dbError);
        return;
      }
  
      // Get all auth users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
      if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
      }
  
      const authUserIds = authUsers.users.map(user => user.id);
      
      // Find orphaned profile records (exist in database but not in auth)
      const orphanedProfiles = dbUsers?.filter(dbUser => 
        !authUserIds.includes(dbUser.id)
      ) || [];
  
      if (orphanedProfiles.length > 0) {
        console.log(`🗑️ Found ${orphanedProfiles.length} orphaned profile records`);
        
        for (const profile of orphanedProfiles) {
          console.log(`🗑️ Removing orphaned profile: ${profile.email}`);
          
          const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', profile.id);
            
          if (deleteError) {
            console.error(`❌ Error deleting orphaned profile ${profile.email}:`, deleteError);
          } else {
            console.log(`✅ Deleted orphaned profile: ${profile.email}`);
          }
        }
        
        toast({
          title: "Cleanup Complete",
          description: `Removed ${orphanedProfiles.length} orphaned profile records`,
        });
        
        // Refresh the users list
        fetchAllUsers();
      } else {
        console.log('✅ No orphaned records found');
        toast({
          title: "Cleanup Complete",
          description: "No orphaned records found",
        });
      }
  
    } catch (error: any) {
      console.error('❌ Error during cleanup:', error);
      toast({
        title: "Cleanup Error",
        description: error.message || "Failed to perform cleanup",
        variant: "destructive",
      });
    }
  };

  const handleUserAdded = (newUser?: any) => {
    if (newUser) {
      // Add to beginning of list with optimistic update
      setUsers(prevUsers => [newUser, ...prevUsers]);
    }
    setShowAddForm(false);
    
    // Refresh data after a short delay to ensure consistency
    setTimeout(() => {
      fetchAllUsers();
    }, 1500);
  };

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to view user management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Users Management
        </h2>
        {canManageUsers && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={cleanupOrphanedRecords}
              className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <Trash2 className="h-4 w-4" />
              Cleanup
            </Button>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? 'Cancel' : 'Add User'}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Role
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Form */}
      {showAddForm && canManageUsers && (
        <UserForm 
          onUserAdded={handleUserAdded}
          currentUserRole={currentUserRole}
        />
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Users ({filteredUsers.length}
            {users.length !== filteredUsers.length && ` of ${users.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No users match your filters'
                : 'No users found'
              }
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageUsers && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const displayName = user.full_name || user.username || 'N/A';
                    const roleConfig = user.role ? ROLE_CONFIGS[user.role as keyof typeof ROLE_CONFIGS] : null;
                    const RoleIcon = roleConfig?.icon || Users;
                    const createdAt = user.created_at 
                      ? new Date(user.created_at).toLocaleDateString() 
                      : 'N/A';
                    
                    return (
                      <TableRow 
                        key={user.id} 
                        className={user.deleting ? 'opacity-50 bg-red-50' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${roleConfig?.color || 'bg-gray-100'}`}>
                              <RoleIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{displayName}</div>
                              {user.username && user.username !== displayName && (
                                <div className="text-sm text-gray-500">@{user.username}</div>
                              )}
                              {user.deleting && (
                                <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Deleting...
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge className={roleConfig?.color || 'bg-gray-100 text-gray-800'}>
                              {roleConfig?.name || user.role}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              No Role
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {canManageUsers && !user.deleting && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user)}
                                className="h-6 w-6 p-0"
                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.is_active ? (
                                  <UserX className="h-3 w-3 text-red-600" />
                                ) : (
                                  <UserCheck className="h-3 w-3 text-green-600" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{createdAt}</TableCell>
                        {canManageUsers && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteUser(user)}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              disabled={
                                user.deleting || 
                                (user.role === 'super_admin' && currentUserRole !== 'super_admin')
                              }
                              title={
                                user.role === 'super_admin' && currentUserRole !== 'super_admin'
                                  ? 'Cannot delete Super Admin'
                                  : 'Delete user'
                              }
                            >
                              {user.deleting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete user "${deleteUser?.full_name || deleteUser?.username || 'Unknown'}"? This action cannot be undone and will remove all associated data.`}
      />
    </div>
  );
};

export default UsersManager;