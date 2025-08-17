import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Eye, Wrench, Crown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface UserFormProps {
  onUserAdded: (newUser?: any) => void;
  currentUserRole?: string;
}

type UserRole = 'super_admin' | 'admin' | 'manager' | 'technician' | 'viewer';

const ROLE_CONFIGS = {
  super_admin: {
    name: 'Super Admin',
    description: 'Complete system access',
    icon: Crown,
    color: 'bg-purple-100 text-purple-800',
    canCreateRoles: ['super_admin', 'admin', 'manager', 'technician', 'viewer']
  },
  admin: {
    name: 'Admin', 
    description: 'Full operational access',
    icon: Shield,
    color: 'bg-red-100 text-red-800',
    canCreateRoles: ['manager', 'technician', 'viewer']
  },
  manager: {
    name: 'Manager',
    description: 'Operations management',
    icon: Users,
    color: 'bg-blue-100 text-blue-800',
    canCreateRoles: ['technician', 'viewer']
  },
  technician: {
    name: 'Technician',
    description: 'Field maintenance',
    icon: Wrench,
    color: 'bg-green-100 text-green-800',
    canCreateRoles: []
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800',
    canCreateRoles: []
  }
};

const UserForm: React.FC<UserFormProps> = ({ onUserAdded, currentUserRole = 'admin' }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    role: 'technician' as UserRole
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const availableRoles = ROLE_CONFIGS[currentUserRole as UserRole]?.canCreateRoles || [];

  const validateForm = () => {
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.username.trim() || formData.username.length < 3) {
      toast({
        title: "Validation Error",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return false;
    }

    if (!availableRoles.includes(formData.role)) {
      toast({
        title: "Validation Error", 
        description: "You cannot create users with this role",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      console.log('🚀 Starting user creation with role:', formData.role);

      // Step 1: Create auth user using ADMIN CLIENT
      console.log('🔐 Creating auth user with admin privileges...');
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: formData.username,
          full_name: formData.full_name || formData.username,
          role: formData.role // Ensure role is set in user_metadata
        },
        app_metadata: {
          role: formData.role, // Also set in app_metadata for additional security
          created_by: 'admin_panel',
          created_at: new Date().toISOString()
        }
      });

      if (authError) {
        console.error('❌ Auth creation error:', authError);
        
        // Provide more specific error messages
        if (authError.message.includes('User not allowed')) {
          throw new Error('Insufficient permissions to create users. Please contact your administrator.');
        }
        if (authError.message.includes('already registered')) {
          throw new Error('A user with this email address already exists.');
        }
        
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Auth user creation failed - no user data returned');
      }

      console.log('✅ Auth user created:', authData.user.email, 'ID:', authData.user.id, 'Role:', formData.role);

      // Step 2: Check if profile already exists and handle accordingly
      console.log('🔍 Checking if user profile already exists...');
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id, email, role')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        console.log('⚠️ User profile already exists, updating instead...');
        // Update existing profile
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            email: formData.email,
            username: formData.username,
            full_name: formData.full_name || formData.username,
            role: formData.role,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('❌ Profile update error:', updateError);
          
          // Clean up auth user if profile update fails
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('🧹 Cleaned up auth user after profile update failure');
          } catch (cleanupError) {
            console.error('❌ Failed to cleanup auth user:', cleanupError);
          }
          
          throw new Error(`Profile update failed: ${updateError.message}`);
        }
        console.log('✅ Profile updated successfully with role:', formData.role);
      } else {
        // Create new profile
        console.log('📝 Creating user profile with data:', {
          id: authData.user.id,
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name || formData.username,
          role: formData.role,
          is_active: true
        });

        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert([
            {
              id: authData.user.id, // Use the auth user's ID
              email: formData.email,
              username: formData.username,
              full_name: formData.full_name || formData.username,
              role: formData.role, // Make sure role is properly set
              is_active: true
            }
          ]);

        if (profileError) {
          console.error('❌ Profile creation error:', profileError);
          
          // Handle duplicate key error specifically
          if (profileError.code === '23505' || profileError.message.includes('duplicate key')) {
            console.log('🔄 Duplicate key detected, attempting to update existing record...');
            
            // Try to update the existing record
            const { error: retryUpdateError } = await supabaseAdmin
              .from('users')
              .update({
                email: formData.email,
                username: formData.username,
                full_name: formData.full_name || formData.username,
                role: formData.role,
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', authData.user.id);

            if (retryUpdateError) {
              console.error('❌ Retry update error:', retryUpdateError);
              
              // Clean up auth user if retry update fails
              try {
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                console.log('🧹 Cleaned up auth user after retry failure');
              } catch (cleanupError) {
                console.error('❌ Failed to cleanup auth user:', cleanupError);
              }
              
              throw new Error(`Profile creation/update failed: ${retryUpdateError.message}`);
            }
            console.log('✅ Profile updated successfully on retry with role:', formData.role);
          } else {
            // Clean up auth user for other profile creation errors
            try {
              await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
              console.log('🧹 Cleaned up auth user after profile creation failure');
            } catch (cleanupError) {
              console.error('❌ Failed to cleanup auth user:', cleanupError);
            }
            
            throw new Error(`Profile creation failed: ${profileError.message}`);
          }
        } else {
          console.log('✅ Profile created successfully with role:', formData.role);
        }
      }

      console.log('✅ Profile created successfully with role:', formData.role);

      // Step 3: Provide optimistic feedback
      const newUser = {
        id: authData.user.id,
        email: formData.email,
        username: formData.username,
        full_name: formData.full_name || formData.username,
        role: formData.role, // Ensure role is included
        is_active: true,
        created_at: new Date().toISOString(),
        email_confirmed: true,
        has_profile: true
      };

      onUserAdded(newUser);

      toast({
        title: "Success",
        description: `User ${formData.username} created successfully with role ${ROLE_CONFIGS[formData.role].name}!`,
      });

      // Reset form
      setFormData({
        email: '',
        username: '', 
        full_name: '',
        password: '',
        confirmPassword: '',
        role: 'technician'
      });

    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      
      // Better error handling
      let errorMessage = 'Failed to create user';
      if (error.message.includes('User not allowed') || error.message.includes('Insufficient permissions')) {
        errorMessage = 'You do not have permission to create users. Please contact your system administrator.';
      } else if (error.message.includes('already registered')) {
        errorMessage = 'A user with this email address already exists.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (availableRoles.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Insufficient Permissions</h3>
            <p>You don't have permission to create new users.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Add New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="johndoe"
                required
                disabled={loading}
                minLength={3}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="role">User Role *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((roleKey) => {
                  const role = ROLE_CONFIGS[roleKey as UserRole];
                  const IconComponent = role.icon;
                  return (
                    <SelectItem key={roleKey} value={roleKey}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {React.createElement(ROLE_CONFIGS[formData.role].icon, { className: "h-4 w-4" })}
              <span className="font-medium">{ROLE_CONFIGS[formData.role].name}</span>
              <Badge className={ROLE_CONFIGS[formData.role].color}>
                {ROLE_CONFIGS[formData.role].description}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {formData.role === 'technician' && 
                "Can view machines, create/update jobs, and generate maintenance reports. Perfect for field workers."
              }
              {formData.role === 'manager' && 
                "Can manage operations, view earnings, and oversee day-to-day activities. Cannot edit financial data."
              }
              {formData.role === 'viewer' && 
                "Read-only access to basic information. Ideal for stakeholders who need visibility."
              }
              {formData.role === 'admin' && 
                "Full operational access including financial reports and system management."
              }
              {formData.role === 'super_admin' && 
                "Complete system access including user management and all administrative functions."
              }
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  email: '',
                  username: '',
                  full_name: '',
                  password: '',
                  confirmPassword: '',
                  role: 'technician'
                });
              }}
              disabled={loading}
            >
              Clear Form
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserForm;