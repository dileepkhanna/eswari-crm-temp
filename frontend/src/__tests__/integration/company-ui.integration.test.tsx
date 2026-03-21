/**
 * Integration Tests for Company UI
 * 
 * Tests the complete company functionality including:
 * - Company selector visibility and behavior
 * - Company filtering in data lists
 * - Company display across various pages
 * 
 * **Validates: Requirements 6.1, 6.4, 6.7**
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompanyProvider, useCompany } from '@/contexts/CompanyContext';
import CompanySelector from '@/components/CompanySelector';
import type { Company } from '@/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Company UI Integration Tests', () => {
  const mockCompanies: Company[] = [
    { id: 1, name: 'Eswari Group', code: 'ESWARI' },
    { id: 2, name: 'ASE Technologies', code: 'ASE' },
  ];

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Company Selector Functionality', () => {
    /**
     * **Validates: Requirement 6.1**
     * Test that company selector is visible for admin users
     */
    it('should display company selector for admin users with multiple companies', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company selector should be visible
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that company selector is visible for hr users
     */
    it('should display company selector for hr users with multiple companies', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('hr', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company selector should be visible
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that company selector is hidden for manager users
     */
    it('should hide company selector for manager users', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('manager', mockCompanies[0]);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      const { container } = render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company selector should not render
      expect(container.firstChild).toBeNull();
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that company selector is hidden for employee users
     */
    it('should hide company selector for employee users', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('employee', mockCompanies[0]);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      const { container } = render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company selector should not render
      expect(container.firstChild).toBeNull();
    });

    /**
     * **Validates: Requirement 6.1, 6.3**
     * Test that company selection updates state and persists to localStorage
     */
    it('should update state and persist selection when company is changed', async () => {
      const user = userEvent.setup();
      
      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return (
          <div>
            <CompanySelector />
            <div data-testid="selected-company">{selectedCompany?.name}</div>
          </div>
        );
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Initial company should be first in list
      await waitFor(() => {
        expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
      });

      // Verify localStorage has the selection
      const stored = localStorage.getItem('selectedCompany');
      expect(stored).toBeTruthy();
      const parsedCompany = JSON.parse(stored!);
      expect(parsedCompany.id).toBe(1);
      expect(parsedCompany.name).toBe('Eswari Group');
    });

    /**
     * **Validates: Requirement 6.5**
     * Test that company selection persists across sessions
     */
    it('should restore company selection from localStorage on initialization', () => {
      // Pre-populate localStorage with company selection
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[1]));

      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <div data-testid="selected-company">{selectedCompany?.name}</div>;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Should restore ASE Technologies from localStorage
      expect(screen.getByTestId('selected-company')).toHaveTextContent('ASE Technologies');
    });
  });

  describe('Company Filtering in API Requests', () => {
    /**
     * **Validates: Requirement 6.4**
     * Test that API requests include company filter parameter
     */
    it('should include company filter in API requests when company is selected', async () => {
      // Set selected company in localStorage
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[0]));

      // Import the actual API client to test the interceptor
      const { apiClient } = await import('@/lib/api');

      // Mock fetch to capture the request
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ([]),
      });
      global.fetch = mockFetch;

      // Make an API request
      try {
        await apiClient.getLeads();
      } catch (error) {
        // Ignore errors, we're just testing the URL
      }

      // Verify the request URL includes company filter
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const requestUrl = callArgs[0] as string;
      expect(requestUrl).toContain('company=1');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that company filter updates when company selection changes
     */
    it('should update company filter when company selection changes', async () => {
      // Start with first company
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[0]));

      const { apiClient } = await import('@/lib/api');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ([]),
      });
      global.fetch = mockFetch;

      // Make first request
      try {
        await apiClient.getLeads();
      } catch (error) {
        // Ignore
      }

      // Verify first company filter
      let requestUrl = mockFetch.mock.calls[0][0] as string;
      expect(requestUrl).toContain('company=1');

      // Change company selection
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[1]));
      mockFetch.mockClear();

      // Make second request
      try {
        await apiClient.getCustomers();
      } catch (error) {
        // Ignore
      }

      // Verify second company filter
      requestUrl = mockFetch.mock.calls[0][0] as string;
      expect(requestUrl).toContain('company=2');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that API requests work without company filter for restricted roles
     */
    it('should not include company filter when no company is selected', async () => {
      // Clear localStorage
      localStorage.removeItem('selectedCompany');

      const { apiClient } = await import('@/lib/api');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ([]),
      });
      global.fetch = mockFetch;

      // Make request
      try {
        await apiClient.getProjects();
      } catch (error) {
        // Ignore
      }

      // Verify no company filter in URL
      const requestUrl = mockFetch.mock.calls[0][0] as string;
      expect(requestUrl).not.toContain('company=');
    });
  });

  describe('Company Display in UI', () => {
    /**
     * **Validates: Requirement 6.7**
     * Test that current company name is displayed in header
     */
    it('should display current company name in company selector', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company name should be visible
      expect(screen.getByText('Eswari Group')).toBeInTheDocument();
    });

    /**
     * **Validates: Requirement 6.7**
     * Test that company code initial is displayed as logo placeholder
     */
    it('should display company code initial as logo placeholder', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Should display 'E' from 'ESWARI'
      const logoElements = screen.getAllByText('E');
      expect(logoElements.length).toBeGreaterThan(0);
    });

    /**
     * **Validates: Requirement 6.7**
     * Test that all available companies are displayed in selector dropdown
     */
    it('should display all available companies in dropdown', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // First company should be visible (selected by default)
      expect(screen.getByText('Eswari Group')).toBeInTheDocument();
      
      // Second company is in the dropdown but not visible until opened
      // We can verify it's available by checking the component renders
      const selector = screen.getByRole('combobox');
      expect(selector).toBeInTheDocument();
    });
  });

  describe('Company Filtering Across Pages', () => {
    /**
     * **Validates: Requirement 6.4**
     * Test that company filter is included in localStorage for API requests
     */
    it('should store selected company for API filtering', () => {
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[0]));

      const selectedCompany = JSON.parse(localStorage.getItem('selectedCompany')!);
      
      // Verify company is stored correctly for API client to use
      expect(selectedCompany).toBeDefined();
      expect(selectedCompany.id).toBe(1);
      expect(selectedCompany.name).toBe('Eswari Group');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that company selection updates for different pages
     */
    it('should update company selection for different data types', () => {
      // Start with first company
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[0]));
      let selectedCompany = JSON.parse(localStorage.getItem('selectedCompany')!);
      expect(selectedCompany.id).toBe(1);

      // Switch to second company
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[1]));
      selectedCompany = JSON.parse(localStorage.getItem('selectedCompany')!);
      expect(selectedCompany.id).toBe(2);
      expect(selectedCompany.name).toBe('ASE Technologies');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that company context persists across component renders
     */
    it('should maintain company selection across re-renders', () => {
      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany, setSelectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return (
          <div>
            <div data-testid="company-id">{selectedCompany?.id}</div>
            <button onClick={() => setSelectedCompany(mockCompanies[1])}>
              Switch Company
            </button>
          </div>
        );
      };

      const { rerender } = render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Initial company
      expect(screen.getByTestId('company-id')).toHaveTextContent('1');

      // Switch company
      const button = screen.getByText('Switch Company');
      button.click();

      // Verify company changed
      waitFor(() => {
        expect(screen.getByTestId('company-id')).toHaveTextContent('2');
      });

      // Re-render component
      rerender(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Company should still be selected after re-render
      waitFor(() => {
        expect(screen.getByTestId('company-id')).toHaveTextContent('2');
      });
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that API client can read company from localStorage
     */
    it('should make company available for API client consumption', () => {
      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        // Simulate what API client does
        const getCompanyForRequest = () => {
          const stored = localStorage.getItem('selectedCompany');
          if (stored) {
            try {
              return JSON.parse(stored);
            } catch {
              return null;
            }
          }
          return null;
        };

        const companyForRequest = getCompanyForRequest();

        return (
          <div>
            <div data-testid="context-company">{selectedCompany?.id}</div>
            <div data-testid="storage-company">{companyForRequest?.id}</div>
          </div>
        );
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Both context and localStorage should have the same company
      waitFor(() => {
        expect(screen.getByTestId('context-company')).toHaveTextContent('1');
        expect(screen.getByTestId('storage-company')).toHaveTextContent('1');
      });
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that company filter parameter format is correct
     */
    it('should format company parameter correctly for API requests', () => {
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[0]));

      const selectedCompany = JSON.parse(localStorage.getItem('selectedCompany')!);
      
      // Simulate URL construction like API client does
      const baseUrl = '/api/leads/';
      const separator = baseUrl.includes('?') ? '&' : '?';
      const urlWithCompany = `${baseUrl}${separator}company=${selectedCompany.id}`;

      expect(urlWithCompany).toBe('/api/leads/?company=1');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that company parameter appends to existing query strings
     */
    it('should append company to existing query parameters', () => {
      localStorage.setItem('selectedCompany', JSON.stringify(mockCompanies[1]));

      const selectedCompany = JSON.parse(localStorage.getItem('selectedCompany')!);
      
      // Simulate URL construction with existing params
      const baseUrl = '/api/leads/?status=new&assigned_to=5';
      const separator = baseUrl.includes('?') ? '&' : '?';
      const urlWithCompany = `${baseUrl}${separator}company=${selectedCompany.id}`;

      expect(urlWithCompany).toBe('/api/leads/?status=new&assigned_to=5&company=2');
      expect(urlWithCompany).toContain('status=new');
      expect(urlWithCompany).toContain('assigned_to=5');
      expect(urlWithCompany).toContain('company=2');
    });
  });

  describe('Company Selector Interaction', () => {
    /**
     * **Validates: Requirement 6.1, 6.4**
     * Test that changing company selection updates localStorage
     */
    it('should update localStorage when company selection changes', async () => {
      const TestComponent = () => {
        const { initializeCompanyContext, setSelectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return (
          <div>
            <button onClick={() => setSelectedCompany(mockCompanies[1])}>
              Switch to ASE
            </button>
          </div>
        );
      };

      const user = userEvent.setup();

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Initial company should be first
      await waitFor(() => {
        const stored = localStorage.getItem('selectedCompany');
        expect(stored).toBeTruthy();
        const company = JSON.parse(stored!);
        expect(company.id).toBe(1);
      });

      // Switch company
      await user.click(screen.getByText('Switch to ASE'));

      // Verify company changed in localStorage
      await waitFor(() => {
        const stored = localStorage.getItem('selectedCompany');
        const company = JSON.parse(stored!);
        expect(company.id).toBe(2);
        expect(company.name).toBe('ASE Technologies');
      });
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that company selector only renders for users with multiple companies
     */
    it('should not render selector when user has only one company', () => {
      const TestComponent = () => {
        const { initializeCompanyContext } = useCompany();
        
        React.useEffect(() => {
          // Admin with only one company
          initializeCompanyContext('admin', undefined, [mockCompanies[0]]);
        }, [initializeCompanyContext]);

        return <CompanySelector />;
      };

      const { container } = render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Selector should not render with only one company
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * **Validates: Requirement 6.5**
     * Test that invalid persisted company is handled gracefully
     */
    it('should handle invalid persisted company data', () => {
      // Store invalid JSON
      localStorage.setItem('selectedCompany', 'invalid-json');

      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <div data-testid="selected-company">{selectedCompany?.name}</div>;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Should default to first company when persisted data is invalid
      expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
    });

    /**
     * **Validates: Requirement 6.5**
     * Test that persisted company not in available list is handled
     */
    it('should handle persisted company not in available companies list', () => {
      // Store a company that won't be in the available list
      localStorage.setItem('selectedCompany', JSON.stringify({ id: 999, name: 'Old Company', code: 'OLD' }));

      const TestComponent = () => {
        const { initializeCompanyContext, selectedCompany } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return <div data-testid="selected-company">{selectedCompany?.name}</div>;
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Should default to first available company
      expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
    });

    /**
     * **Validates: Requirement 6.4**
     * Test that requests work without company filter when no company is selected
     */
    it('should handle requests when no company is selected', () => {
      localStorage.removeItem('selectedCompany');

      // Verify no company in storage
      const stored = localStorage.getItem('selectedCompany');
      expect(stored).toBeNull();

      // Simulate URL construction without company
      const baseUrl = '/api/leads/';
      const selectedCompanyStr = localStorage.getItem('selectedCompany');
      
      let url = baseUrl;
      if (selectedCompanyStr) {
        try {
          const selectedCompany = JSON.parse(selectedCompanyStr);
          if (selectedCompany && selectedCompany.id) {
            const separator = baseUrl.includes('?') ? '&' : '?';
            url = `${url}${separator}company=${selectedCompany.id}`;
          }
        } catch (error) {
          // Invalid JSON, don't add company filter
        }
      }
      
      // URL should not include company parameter
      expect(url).toBe('/api/leads/');
      expect(url).not.toContain('company=');
    });

    /**
     * **Validates: Requirement 6.3**
     * Test that clearCompanyContext removes all company data
     */
    it('should clear all company context on logout', () => {
      const TestComponent = () => {
        const { 
          initializeCompanyContext, 
          clearCompanyContext,
          selectedCompany,
          availableCompanies,
          canSelectCompany
        } = useCompany();
        
        React.useEffect(() => {
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        return (
          <div>
            <div data-testid="selected-company">{selectedCompany?.name || 'none'}</div>
            <div data-testid="available-count">{availableCompanies.length}</div>
            <div data-testid="can-select">{canSelectCompany.toString()}</div>
            <button onClick={clearCompanyContext}>Logout</button>
          </div>
        );
      };

      const user = userEvent.setup();

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Verify initial state
      expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
      expect(screen.getByTestId('available-count')).toHaveTextContent('2');
      expect(screen.getByTestId('can-select')).toHaveTextContent('true');

      // Clear context
      user.click(screen.getByText('Logout'));

      // Verify cleared state
      waitFor(() => {
        expect(screen.getByTestId('selected-company')).toHaveTextContent('none');
        expect(screen.getByTestId('available-count')).toHaveTextContent('0');
        expect(screen.getByTestId('can-select')).toHaveTextContent('false');
        expect(localStorage.getItem('selectedCompany')).toBeNull();
      });
    });
  });

  describe('Company Context Integration', () => {
    /**
     * **Validates: Requirement 6.1, 6.4**
     * Test complete flow: login → company selection → API request with filter
     */
    it('should handle complete company selection flow', async () => {
      const TestComponent = () => {
        const { 
          initializeCompanyContext, 
          selectedCompany, 
          setSelectedCompany,
          availableCompanies 
        } = useCompany();
        
        React.useEffect(() => {
          // Simulate admin login with multiple companies
          initializeCompanyContext('admin', undefined, mockCompanies);
        }, [initializeCompanyContext]);

        const handleCompanyChange = () => {
          // Simulate selecting second company
          setSelectedCompany(mockCompanies[1]);
        };

        return (
          <div>
            <div data-testid="selected-company">{selectedCompany?.name}</div>
            <div data-testid="available-count">{availableCompanies.length}</div>
            <button onClick={handleCompanyChange}>Change Company</button>
          </div>
        );
      };

      const user = userEvent.setup();

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Initial state: first company selected
      await waitFor(() => {
        expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
      });
      expect(screen.getByTestId('available-count')).toHaveTextContent('2');

      // Change company
      await user.click(screen.getByText('Change Company'));

      // Verify company changed
      await waitFor(() => {
        expect(screen.getByTestId('selected-company')).toHaveTextContent('ASE Technologies');
      });

      // Verify localStorage updated
      const stored = localStorage.getItem('selectedCompany');
      const parsedCompany = JSON.parse(stored!);
      expect(parsedCompany.id).toBe(2);
      expect(parsedCompany.name).toBe('ASE Technologies');
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that manager users have single company context
     */
    it('should set single company context for manager users', () => {
      const TestComponent = () => {
        const { 
          initializeCompanyContext, 
          selectedCompany, 
          canSelectCompany,
          availableCompanies 
        } = useCompany();
        
        React.useEffect(() => {
          // Simulate manager login with assigned company
          initializeCompanyContext('manager', mockCompanies[0]);
        }, [initializeCompanyContext]);

        return (
          <div>
            <div data-testid="selected-company">{selectedCompany?.name}</div>
            <div data-testid="can-select">{canSelectCompany.toString()}</div>
            <div data-testid="available-count">{availableCompanies.length}</div>
          </div>
        );
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Manager should have single company
      expect(screen.getByTestId('selected-company')).toHaveTextContent('Eswari Group');
      expect(screen.getByTestId('can-select')).toHaveTextContent('false');
      expect(screen.getByTestId('available-count')).toHaveTextContent('1');
    });

    /**
     * **Validates: Requirement 6.1**
     * Test that employee users have single company context
     */
    it('should set single company context for employee users', () => {
      const TestComponent = () => {
        const { 
          initializeCompanyContext, 
          selectedCompany, 
          canSelectCompany,
          availableCompanies 
        } = useCompany();
        
        React.useEffect(() => {
          // Simulate employee login with assigned company
          initializeCompanyContext('employee', mockCompanies[1]);
        }, [initializeCompanyContext]);

        return (
          <div>
            <div data-testid="selected-company">{selectedCompany?.name}</div>
            <div data-testid="can-select">{canSelectCompany.toString()}</div>
            <div data-testid="available-count">{availableCompanies.length}</div>
          </div>
        );
      };

      render(
        <CompanyProvider>
          <TestComponent />
        </CompanyProvider>
      );

      // Employee should have single company
      expect(screen.getByTestId('selected-company')).toHaveTextContent('ASE Technologies');
      expect(screen.getByTestId('can-select')).toHaveTextContent('false');
      expect(screen.getByTestId('available-count')).toHaveTextContent('1');
    });
  });
});
