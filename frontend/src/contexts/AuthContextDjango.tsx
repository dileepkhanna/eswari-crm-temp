import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { UserRole } from '@/types';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
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
  manager_name?: string | null;
  employees_count?: number;
  employees_names?: string[];
  company?: Company;
  available_companies?: Company[];
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
  createInitialAdmin: (firstName: string, lastName: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  // Company context is initialized by CompanyAuthBridge (which sits inside both providers)
  const companyContext: any = null;

  // Check if admin exists by checking if we can access the API
  const checkAdminExists = useCallback(async () => {
    try {
      const result = await apiClient.checkAdminExists();
      setAdminExists(result.admin_exists);
    } catch (error) {
      logger.error('Error checking admin exists:', error);
      setAdminExists(null);
    }
  }, []);

  // Fetch user profile
  const fetchUserData = useCallback(async () => {
    try {
      const userData = await apiClient.getProfile() as any;
      
      const authUser: AuthUser = {
        id: userData.id.toString(),
        userId: userData.username,
        name: `${userData.first_name} ${userData.last_name}`.trim() || userData.username,
        email: userData.email,
        phone: userData.phone,
        address: null, // Django model doesn't have address yet
        role: userData.role as UserRole,
        status: 'active',
        managerId: userData.manager ? userData.manager.toString() : null,
        manager_name: userData.manager_name,
        employees_count: userData.employees_count,
        employees_names: userData.employees_names,
        company: userData.company_info || userData.company,
        available_companies: userData.available_companies,
      };

      setUser(authUser);
      setSession({ user: userData });

      // For admin/hr, fetch the full companies list since profile endpoint doesn't include it
      let availableCompanies = userData.available_companies || [];
      const userCompany = userData.company_info || userData.company;

      if (userData.role in ['admin', 'hr'] || ['admin', 'hr'].includes(userData.role)) {
        try {
          const companiesResponse = await apiClient.getCompanies() as any;
          availableCompanies = Array.isArray(companiesResponse)
            ? companiesResponse
            : companiesResponse.results || [];
        } catch (e) {
          logger.error('Failed to fetch companies for admin/hr:', e);
        }
      }

      // Initialize company context
      if (companyContext) {
        companyContext.initializeCompanyContext(
          userData.role,
          userCompany,
          availableCompanies
        );
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setSession(null);
      throw error; // Re-throw to be handled by initAuth
    }
  }, [companyContext]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          await fetchUserData();
        } catch (error) {
          // If fetching user data fails, clear the invalid tokens
          logger.log('Invalid token detected, clearing authentication state');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setUser(null);
          setSession(null);
        }
      }
      
      await checkAdminExists();
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUserData, checkAdminExists]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiClient.login(email, password) as any;
      
      // companies list comes from data.companies (top-level), not data.user.available_companies
      const availableCompanies = data.companies || data.user.available_companies || [];
      const userCompany = data.company || data.user.company_info || data.user.company;

      const authUser: AuthUser = {
        id: data.user.id.toString(),
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: data.user.manager ? data.user.manager.toString() : null,
        manager_name: data.user.manager_name,
        employees_count: data.user.employees_count,
        employees_names: data.user.employees_names,
        company: userCompany,
        available_companies: availableCompanies,
      };

      setUser(authUser);
      setSession({ user: data.user });

      // Initialize company context — always call for admin/hr even if no assigned company
      if (companyContext) {
        companyContext.initializeCompanyContext(
          data.user.role,
          userCompany,
          availableCompanies
        );
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, [companyContext]);

  // Login with User ID (username) instead of email
  const loginWithUserId = useCallback(async (userId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Send userId as the email field - backend will detect it's not an email and use it as username
      const data = await apiClient.login(userId, password) as any;
      
      // companies list comes from data.companies (top-level), not data.user.available_companies
      const availableCompanies = data.companies || data.user.available_companies || [];
      const userCompany = data.company || data.user.company_info || data.user.company;

      const authUser: AuthUser = {
        id: data.user.id.toString(),
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: data.user.manager ? data.user.manager.toString() : null,
        manager_name: data.user.manager_name,
        employees_count: data.user.employees_count,
        employees_names: data.user.employees_names,
        company: userCompany,
        available_companies: availableCompanies,
      };

      setUser(authUser);
      setSession({ user: data.user });

      // Initialize company context — always call for admin/hr even if no assigned company
      if (companyContext) {
        companyContext.initializeCompanyContext(
          data.user.role,
          userCompany,
          availableCompanies
        );
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Login with User ID error:', error);
      return { success: false, error: error.message || 'Invalid User ID or password' };
    }
  }, [companyContext]);

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

      const data = await apiClient.register(userData) as any;
      
      const authUser: AuthUser = {
        id: data.user.id.toString(),
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: data.user.manager ? data.user.manager.toString() : null,
        manager_name: data.user.manager_name,
        employees_count: data.user.employees_count,
        employees_names: data.user.employees_names,
      };

      setUser(authUser);
      setSession({ user: data.user });
      await checkAdminExists();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  }, [checkAdminExists]);

  const createInitialAdmin = useCallback(async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiClient.createInitialAdmin({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone: phone || '',
      }) as any;
      
      const authUser: AuthUser = {
        id: data.user.id.toString(),
        userId: data.user.username,
        name: `${data.user.first_name} ${data.user.last_name}`.trim() || data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        address: null,
        role: data.user.role as UserRole,
        status: 'active',
        managerId: data.user.manager ? data.user.manager.toString() : null,
        manager_name: data.user.manager_name,
        employees_count: data.user.employees_count,
        employees_names: data.user.employees_names,
        company: data.user.company_info || data.user.company,
        available_companies: data.user.available_companies,
      };

      setUser(authUser);
      setSession({ user: data.user });
      
      // Initialize company context after successful admin creation
      if (companyContext && (data.user.company_info || data.user.company)) {
        companyContext.initializeCompanyContext(
          data.user.role,
          data.user.company_info || data.user.company,
          data.user.available_companies
        );
      }
      
      await checkAdminExists();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create admin' };
    }
  }, [checkAdminExists, companyContext]);

  const createUser = useCallback(async (
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string,
    role: UserRole,
    company: number,
    managerId?: string
  ): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      logger.log('[AuthContext] createUser called with company:', company);
      
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
        company, // Add company field
        ...(managerId && { manager: parseInt(managerId) }), // Add manager if provided
      };

      logger.log('[AuthContext] Sending userData to API:', userData);
      const data = await apiClient.createUser(userData);
      return { success: true, userId: data.user.username }; // Return username as userId
    } catch (error: any) {
      logger.error('Create user error:', error);
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
          logger.error('Error parsing validation details:', parseError);
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
    
    // Clear company context on logout
    if (companyContext) {
      companyContext.clearCompanyContext();
    }
    
    await checkAdminExists();
  }, [checkAdminExists, companyContext]);

  const refreshUser = useCallback(async () => {
    try {
      await fetchUserData();
    } catch (error) {
      logger.error('Error refreshing user data:', error);
    }
  }, [fetchUserData]);

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
      createInitialAdmin,
      logout,
      refreshUser,
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