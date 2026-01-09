import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { UserRole } from '@/types';

interface AuthUser {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  status: string;
  managerId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminExists: boolean | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithUserId: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, phone: string, address: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (email: string, password: string, name: string, phone: string, address: string, role: UserRole, managerId?: string) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  // Check if admin exists by checking if we can access the API
  const checkAdminExists = useCallback(async () => {
    // For now, just assume admin exists. This can be enhanced later.
    setAdminExists(true);
  }, []);

  // Fetch user profile
  const fetchUserData = useCallback(async () => {
    try {
      const userData = await apiClient.getProfile();
      
      const authUser: AuthUser = {
        id: userData.id,
        userId: userData.username,
        name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
        email: userData.email,
        phone: userData.phone,
        address: null, // Django model doesn't have address yet
        role: userData.role as UserRole,
        status: 'active',
        managerId: null, // Django model doesn't have manager_id yet
      };

      setUser(authUser);
      setSession({ user: userData });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetchUserData();
      }
      await checkAdminExists();
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUserData, checkAdminExists]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiClient.login(email, password);
      
      const authUser: AuthUser = {
        id: data.user.id,
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: null,
      };

      setUser(authUser);
      setSession({ user: data.user });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  // For now, loginWithUserId will work the same as login (can be enhanced later)
  const loginWithUserId = useCallback(async (userId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // For now, treat userId as email. You can enhance this later in Django
    return login(userId, password);
  }, [login]);

  const signup = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    phone: string, 
    address: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const userData = {
        username: email.split('@')[0], // Use email prefix as username
        email,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        phone,
      };

      const data = await apiClient.register(userData);
      
      const authUser: AuthUser = {
        id: data.user.id,
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: null,
      };

      setUser(authUser);
      setSession({ user: data.user });
      await checkAdminExists();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  }, [checkAdminExists]);

  const createUser = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string,
    role: UserRole,
    managerId?: string
  ): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const userData = {
        email,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        ...(managerId && { manager: parseInt(managerId) }), // Add manager if provided
      };

      const data = await apiClient.createUser(userData);
      return { success: true, userId: data.user.username }; // Return username as userId
    } catch (error: any) {
      console.error('Create user error:', error);
      let errorMessage = 'Failed to create user';
      
      // Try to parse detailed error information
      if (error.message.includes('details:')) {
        try {
          const detailsStart = error.message.indexOf('details:') + 8;
          const detailsJson = error.message.substring(detailsStart);
          const details = JSON.parse(detailsJson);
          
          if (details.details) {
            // Handle validation errors
            const validationErrors = [];
            for (const [field, errors] of Object.entries(details.details)) {
              if (Array.isArray(errors)) {
                validationErrors.push(`${field}: ${errors.join(', ')}`);
              }
            }
            if (validationErrors.length > 0) {
              errorMessage = validationErrors.join('; ');
            }
          } else if (details.error) {
            errorMessage = details.error;
          }
        } catch (parseError) {
          console.error('Error parsing validation details:', parseError);
        }
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid user data. Please check all fields.';
      } else if (error.message.includes('username')) {
        errorMessage = 'Username already exists. Please try a different email.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Email already exists. Please try a different email.';
      }
      
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    setSession(null);
    await checkAdminExists();
  }, [checkAdminExists]);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Manager permissions
    if (user.role === 'manager') {
      const managerPermissions: Record<string, string[]> = {
        leads: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        projects: ['view'],
        leaves: ['view', 'approve'],
        reports: ['view'],
      };
      return managerPermissions[module]?.includes(action) || false;
    }

    // Employee permissions (backend uses 'employee' role)
    if (user.role === 'employee') {
      const employeePermissions: Record<string, string[]> = {
        leads: ['view', 'create', 'edit'],
        tasks: ['view', 'create', 'edit'],
        projects: ['view'],
        leaves: ['view', 'create'],
      };
      return employeePermissions[module]?.includes(action) || false;
    }

    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!user, 
      isLoading,
      adminExists,
      login, 
      loginWithUserId,
      signup,
      createUser,
      logout, 
      hasPermission 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}