import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContextDjango';
import { apiClient } from '@/lib/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    checkAdminExists: vi.fn(),
    createInitialAdmin: vi.fn(),
  },
}));

// Mock CompanyContext
const mockInitializeCompanyContext = vi.fn();
const mockClearCompanyContext = vi.fn();

vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    initializeCompanyContext: mockInitializeCompanyContext,
    clearCompanyContext: mockClearCompanyContext,
    selectedCompany: null,
    availableCompanies: [],
    canSelectCompany: false,
    setSelectedCompany: vi.fn(),
  }),
}));

describe('AuthContextDjango - Company Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (apiClient.checkAdminExists as any).mockResolvedValue({ admin_exists: true });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Login with company information', () => {
    it('should initialize company context for admin users with available companies', async () => {
      const mockLoginResponse = {
        user: {
          id: 1,
          username: 'admin_user',
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@test.com',
          phone: '1234567890',
          role: 'admin',
          company: { id: 1, name: 'Default Company', code: 'DEFAULT' },
          available_companies: [
            { id: 1, name: 'Default Company', code: 'DEFAULT' },
            { id: 2, name: 'Company B', code: 'COMPB' },
          ],
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('admin@test.com', 'password');
      });

      // Verify company context was initialized
      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'admin',
        { id: 1, name: 'Default Company', code: 'DEFAULT' },
        [
          { id: 1, name: 'Default Company', code: 'DEFAULT' },
          { id: 2, name: 'Company B', code: 'COMPB' },
        ]
      );

      // Verify user has company information
      expect(result.current.user?.company).toEqual({ id: 1, name: 'Default Company', code: 'DEFAULT' });
      expect(result.current.user?.available_companies).toHaveLength(2);
    });

    it('should initialize company context for HR users with available companies', async () => {
      const mockLoginResponse = {
        user: {
          id: 2,
          username: 'hr_user',
          first_name: 'HR',
          last_name: 'User',
          email: 'hr@test.com',
          phone: '1234567890',
          role: 'hr',
          company: { id: 1, name: 'Default Company', code: 'DEFAULT' },
          available_companies: [
            { id: 1, name: 'Default Company', code: 'DEFAULT' },
            { id: 3, name: 'Company C', code: 'COMPC' },
          ],
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('hr@test.com', 'password');
      });

      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'hr',
        { id: 1, name: 'Default Company', code: 'DEFAULT' },
        expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 3 }),
        ])
      );
    });

    it('should initialize company context for manager users with single company', async () => {
      const mockLoginResponse = {
        user: {
          id: 3,
          username: 'manager_user',
          first_name: 'Manager',
          last_name: 'User',
          email: 'manager@test.com',
          phone: '1234567890',
          role: 'manager',
          company: { id: 2, name: 'Company B', code: 'COMPB' },
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('manager@test.com', 'password');
      });

      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'manager',
        { id: 2, name: 'Company B', code: 'COMPB' },
        undefined
      );
    });

    it('should initialize company context for employee users with single company', async () => {
      const mockLoginResponse = {
        user: {
          id: 4,
          username: 'employee_user',
          first_name: 'Employee',
          last_name: 'User',
          email: 'employee@test.com',
          phone: '1234567890',
          role: 'employee',
          company: { id: 3, name: 'Company C', code: 'COMPC' },
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('employee@test.com', 'password');
      });

      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'employee',
        { id: 3, name: 'Company C', code: 'COMPC' },
        undefined
      );
    });
  });

  describe('Logout with company context', () => {
    it('should clear company context on logout', async () => {
      const mockLoginResponse = {
        user: {
          id: 1,
          username: 'test_user',
          first_name: 'Test',
          last_name: 'User',
          email: 'test@test.com',
          phone: '1234567890',
          role: 'admin',
          company: { id: 1, name: 'Default Company', code: 'DEFAULT' },
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.login as any).mockResolvedValue(mockLoginResponse);
      (apiClient.logout as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@test.com', 'password');
      });

      expect(mockInitializeCompanyContext).toHaveBeenCalled();

      await act(async () => {
        await result.current.logout();
      });

      expect(mockClearCompanyContext).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('Session restoration with company context', () => {
    it('should restore company context when session is restored', async () => {
      localStorage.setItem('access_token', 'existing-token');

      const mockProfileResponse = {
        id: 1,
        username: 'admin_user',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@test.com',
        phone: '1234567890',
        role: 'admin',
        company: { id: 1, name: 'Default Company', code: 'DEFAULT' },
        available_companies: [
          { id: 1, name: 'Default Company', code: 'DEFAULT' },
          { id: 2, name: 'Company B', code: 'COMPB' },
        ],
      };

      (apiClient.getProfile as any).mockResolvedValue(mockProfileResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify company context was initialized during session restoration
      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'admin',
        { id: 1, name: 'Default Company', code: 'DEFAULT' },
        expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
        ])
      );

      expect(result.current.user?.company).toBeDefined();
    });
  });

  describe('Initial admin creation with company context', () => {
    it('should initialize company context after creating initial admin', async () => {
      const mockAdminResponse = {
        user: {
          id: 1,
          username: 'admin',
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@test.com',
          phone: '1234567890',
          role: 'admin',
          company: { id: 1, name: 'Default Company', code: 'DEFAULT' },
          available_companies: [{ id: 1, name: 'Default Company', code: 'DEFAULT' }],
        },
        access: 'access-token',
        refresh: 'refresh-token',
      };

      (apiClient.createInitialAdmin as any).mockResolvedValue(mockAdminResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createInitialAdmin('Admin', 'User', 'admin@test.com', 'password', '1234567890');
      });

      expect(mockInitializeCompanyContext).toHaveBeenCalledWith(
        'admin',
        { id: 1, name: 'Default Company', code: 'DEFAULT' },
        [{ id: 1, name: 'Default Company', code: 'DEFAULT' }]
      );
    });
  });
});
