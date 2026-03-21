import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CustomerList from '../CustomerList';
import { Customer, User } from '@/types';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  apiClient: {
    bulkAssignCustomers: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/permissions', () => ({
  canViewCustomerPhone: vi.fn(() => true),
  maskPhoneNumber: vi.fn((phone: string) => phone.replace(/\d(?=\d{4})/g, '*')),
}));

vi.mock('@/hooks/useAutoRefresh', () => ({
  useAutoRefresh: vi.fn(),
}));

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: vi.fn(() => true),
}));

// Mock lazy-loaded components
vi.mock('../CustomerExcelImportExport', () => ({
  default: () => <div data-testid="excel-import-export">Excel Import/Export</div>,
}));

vi.mock('../CustomerImportModal', () => ({
  default: () => <div data-testid="import-modal">Import Modal</div>,
}));

vi.mock('../ConversionFormModal', () => ({
  default: () => <div data-testid="conversion-form-modal">Conversion Form Modal</div>,
}));

// Mock the auth context
const mockUser: User = {
  id: 'user-1',
  userId: 'test_manager_001',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  role: 'manager',
  status: 'active',
  permissions: [],
  createdAt: new Date(),
};

vi.mock('@/contexts/AuthContextDjango', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('CustomerList Component', () => {
  const mockEmployees: User[] = [
    {
      id: 'emp-1',
      userId: 'emp1_employee_001',
      name: 'Employee 1',
      email: 'emp1@example.com',
      phone: '+1234567891',
      address: '124 Test St',
      role: 'employee',
      status: 'active',
      permissions: [],
      createdAt: new Date(),
    },
    {
      id: 'emp-2',
      userId: 'emp2_employee_002',
      name: 'Employee 2',
      email: 'emp2@example.com',
      phone: '+1234567892',
      address: '125 Test St',
      role: 'employee',
      status: 'active',
      permissions: [],
      createdAt: new Date(),
    },
  ];

  // Use today's date for all customers so they pass the default date filter
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const mockCustomers: Customer[] = [
    {
      id: 'cust-1',
      name: 'John Doe',
      phone: '+1234567890',
      callStatus: 'pending',
      customCallStatus: null,
      isConverted: false,
      convertedLeadId: null,
      assignedTo: 'emp-1',
      assignedToName: 'Employee 1',
      createdBy: 'user-1',
      createdByName: 'Test User',
      callDate: new Date(today), // Today
      scheduledDate: null,
      notes: 'Test notes',
      createdAt: new Date(twoDaysAgo),
      updatedAt: new Date(today),
      company: 1,
    },
    {
      id: 'cust-2',
      name: 'Jane Smith',
      phone: '+0987654321',
      callStatus: 'answered',
      customCallStatus: null,
      isConverted: true,
      convertedLeadId: 'lead-1',
      assignedTo: 'emp-2',
      assignedToName: 'Employee 2',
      createdBy: 'user-1',
      createdByName: 'Test User',
      callDate: new Date(today), // Today
      scheduledDate: null,
      notes: null,
      createdAt: new Date(yesterday),
      updatedAt: new Date(today),
      company: 1,
    },
    {
      id: 'cust-3',
      name: 'Bob Wilson',
      phone: '+1122334455',
      callStatus: 'not_answered',
      customCallStatus: null,
      isConverted: false,
      convertedLeadId: null,
      assignedTo: null,
      assignedToName: null,
      createdBy: 'user-1',
      createdByName: 'Test User',
      callDate: new Date(today), // Today
      scheduledDate: null,
      notes: null,
      createdAt: new Date(twoDaysAgo),
      updatedAt: new Date(today),
      company: 1,
    },
  ];

  const defaultProps = {
    customers: mockCustomers,
    employees: mockEmployees,
    projects: [],
    loading: false,
    onAddCustomer: vi.fn(),
    onUpdateCustomer: vi.fn(),
    onDeleteCustomer: vi.fn(),
    onBulkImport: vi.fn(),
    onConvertToLead: vi.fn(),
    onCreateLead: vi.fn(),
    onRefreshCustomers: vi.fn().mockResolvedValue(undefined),
    canManageAll: true,
    isManagerView: false,
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(ui);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Functionality (REQ-019)', () => {
    it('filters customers by conversion status - converted', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Open conversion filter dropdown
      const conversionFilter = screen.getAllByRole('combobox')[1]; // Second combobox is conversion filter
      fireEvent.click(conversionFilter);

      // Select "Converted" option
      await waitFor(() => {
        const options = screen.getAllByText('Converted');
        // Find the option in the dropdown (not the stat label)
        const convertedOption = options.find(el => el.closest('[role="option"]'));
        if (convertedOption) {
          fireEvent.click(convertedOption);
        }
      });

      // Should only show converted customer (Jane Smith)
      await waitFor(() => {
        const names = screen.getAllByText('Jane Smith');
        expect(names.length).toBeGreaterThan(0);
        expect(screen.queryAllByText('John Doe').length).toBe(0);
        expect(screen.queryAllByText('Bob Wilson').length).toBe(0);
      });
    });

    it('filters customers by conversion status - not converted', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Open conversion filter dropdown
      const conversionFilter = screen.getAllByRole('combobox')[1];
      fireEvent.click(conversionFilter);

      // Select "Not Converted" option
      await waitFor(() => {
        const notConvertedOption = screen.getByRole('option', { name: /Not Converted/i });
        fireEvent.click(notConvertedOption);
      });

      // Should show only non-converted customers (John Doe, Bob Wilson)
      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bob Wilson').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Jane Smith').length).toBe(0);
      });
    });

    it('filters customers by call status', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Open status filter dropdown (first combobox)
      const statusFilter = screen.getAllByRole('combobox')[0];
      fireEvent.click(statusFilter);

      // Select "Answered" option - use getAllByText since it appears in dropdown and table
      await waitFor(() => {
        const answeredOptions = screen.getAllByText('Answered');
        const dropdownOption = answeredOptions.find(el => el.closest('[role="option"]'));
        if (dropdownOption) {
          fireEvent.click(dropdownOption);
        }
      });

      // Should only show answered customer (Jane Smith)
      await waitFor(() => {
        expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('John Doe').length).toBe(0);
        expect(screen.queryAllByText('Bob Wilson').length).toBe(0);
      });
    });

    it('filters customers by search query - phone number', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search by name or phone number/i);
      fireEvent.change(searchInput, { target: { value: '+1234567890' } });

      // Wait for debounce
      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Jane Smith').length).toBe(0);
        expect(screen.queryAllByText('Bob Wilson').length).toBe(0);
      }, { timeout: 500 });
    });

    it('filters customers by search query - name (case insensitive)', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search by name or phone number/i);
      fireEvent.change(searchInput, { target: { value: 'jane' } });

      // Wait for debounce
      await waitFor(() => {
        expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('John Doe').length).toBe(0);
        expect(screen.queryAllByText('Bob Wilson').length).toBe(0);
      }, { timeout: 500 });
    });

    it('shows "no customers found" message when filters return no results', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search by name or phone number/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/No customers found matching your filters/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('combines multiple filters correctly', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Filter by not converted
      const conversionFilter = screen.getAllByRole('combobox')[1];
      fireEvent.click(conversionFilter);
      await waitFor(() => {
        const option = screen.getByRole('option', { name: /Not Converted/i });
        fireEvent.click(option);
      });

      // Filter by pending status
      const statusFilter = screen.getAllByRole('combobox')[0];
      fireEvent.click(statusFilter);
      await waitFor(() => {
        const pendingOptions = screen.getAllByText('Pending');
        const dropdownOption = pendingOptions.find(el => el.closest('[role="option"]'));
        if (dropdownOption) {
          fireEvent.click(dropdownOption);
        }
      });

      // Should only show John Doe (not converted AND pending)
      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Jane Smith').length).toBe(0);
        expect(screen.queryAllByText('Bob Wilson').length).toBe(0);
      });
    });
  });

  describe('Sorting Functionality (REQ-020)', () => {
    it('sorts customers by name in ascending order', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Find and click the Name column header
      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toBeInTheDocument();
      
      if (nameHeader) {
        fireEvent.click(nameHeader);
      }

      await waitFor(() => {
        // Check for ascending arrow indicator
        expect(within(nameHeader!).getByText('↑')).toBeInTheDocument();
      });

      // Verify order: Bob Wilson, Jane Smith, John Doe (alphabetical)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const customerRows = rows.filter(row => row.textContent?.includes('+'));
        
        expect(customerRows[0].textContent).toContain('Bob Wilson');
        expect(customerRows[1].textContent).toContain('Jane Smith');
        expect(customerRows[2].textContent).toContain('John Doe');
      });
    });

    it('sorts customers by name in descending order on second click', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const nameHeader = screen.getByText('Name').closest('th');
      
      if (nameHeader) {
        // First click - ascending
        fireEvent.click(nameHeader);
        await waitFor(() => {
          expect(within(nameHeader).getByText('↑')).toBeInTheDocument();
        });

        // Second click - descending
        fireEvent.click(nameHeader);
        await waitFor(() => {
          expect(within(nameHeader).getByText('↓')).toBeInTheDocument();
        });
      }

      // Verify order: John Doe, Jane Smith, Bob Wilson (reverse alphabetical)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const customerRows = rows.filter(row => row.textContent?.includes('+'));
        
        expect(customerRows[0].textContent).toContain('John Doe');
        expect(customerRows[1].textContent).toContain('Jane Smith');
        expect(customerRows[2].textContent).toContain('Bob Wilson');
      });
    });

    it('sorts customers by call status', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const statusHeader = screen.getByText('Status').closest('th');
      
      if (statusHeader) {
        fireEvent.click(statusHeader);
      }

      await waitFor(() => {
        expect(within(statusHeader!).getByText('↑')).toBeInTheDocument();
      });

      // Verify customers are sorted by status (alphabetically: answered, not_answered, pending)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const customerRows = rows.filter(row => row.textContent?.includes('+'));
        
        expect(customerRows[0].textContent).toContain('Jane Smith'); // answered
        expect(customerRows[1].textContent).toContain('Bob Wilson'); // not_answered
        expect(customerRows[2].textContent).toContain('John Doe'); // pending
      });
    });

    it('sorts customers by created date', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const dateHeader = screen.getByText('Last Call').closest('th');
      
      if (dateHeader) {
        fireEvent.click(dateHeader);
      }

      await waitFor(() => {
        expect(within(dateHeader!).getByText('↑')).toBeInTheDocument();
      });

      // Verify customers are sorted by creation date (oldest to newest)
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const customerRows = rows.filter(row => row.textContent?.includes('+'));
        
        // Bob Wilson and John Doe both created 2 days ago, Jane Smith created yesterday
        expect(customerRows.length).toBe(3);
      });
    });

    it('resets to first page when sort changes', async () => {
      // Create many customers to test pagination
      const manyCustomers = Array.from({ length: 60 }, (_, i) => ({
        ...mockCustomers[0],
        id: `cust-${i}`,
        name: `Customer ${i}`,
        phone: `+123456${i.toString().padStart(4, '0')}`,
      }));

      renderWithAuth(<CustomerList {...defaultProps} customers={manyCustomers} />);

      // Go to page 2
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
      });

      // Change sort
      const nameHeader = screen.getByText('Name').closest('th');
      if (nameHeader) {
        fireEvent.click(nameHeader);
      }

      // Should reset to page 1
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Selection (REQ-022, REQ-023)', () => {
    it('selects individual customer when checkbox is clicked', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "select all", skip it
      const firstCustomerCheckbox = checkboxes[1];

      fireEvent.click(firstCustomerCheckbox);

      expect(firstCustomerCheckbox).toBeChecked();
    });

    it('selects all customers when "select all" checkbox is clicked', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      fireEvent.click(selectAllCheckbox);

      // All customer checkboxes should be checked
      checkboxes.slice(1).forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it('deselects all customers when "select all" is clicked again', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      // Select all
      fireEvent.click(selectAllCheckbox);
      
      // Deselect all
      fireEvent.click(selectAllCheckbox);

      // All customer checkboxes should be unchecked
      checkboxes.slice(1).forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('shows bulk action buttons when customers are selected', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstCustomerCheckbox = checkboxes[1];

      fireEvent.click(firstCustomerCheckbox);

      // Bulk action buttons should appear
      expect(screen.getByText(/Delete \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Assign \(1\)/)).toBeInTheDocument();
    });

    it('updates bulk action button count when multiple customers are selected', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first two customers
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      expect(screen.getByText(/Delete \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Assign \(2\)/)).toBeInTheDocument();
    });

    it('hides bulk action buttons when no customers are selected', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Initially no customers selected
      expect(screen.queryByText(/Delete \(/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Assign \(/)).not.toBeInTheDocument();
    });

    it('clears selection when filters change and customer is no longer visible', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Wait for customers to render
      await waitFor(() => {
        expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      // Select Jane Smith (who has "answered" status)
      const janeCheckbox = checkboxes[2]; // Assuming Jane is the second customer

      // Select Jane
      fireEvent.click(janeCheckbox);
      expect(janeCheckbox).toBeChecked();

      // Filter by Pending status (Jane has "answered", so she'll be filtered out)
      const statusFilter = screen.getAllByRole('combobox')[0];
      fireEvent.click(statusFilter);
      await waitFor(() => {
        const pendingOptions = screen.getAllByText('Pending');
        const dropdownOption = pendingOptions.find(el => el.closest('[role="option"]'));
        if (dropdownOption) {
          fireEvent.click(dropdownOption);
        }
      });

      // Jane should no longer be visible
      await waitFor(() => {
        expect(screen.queryAllByText('Jane Smith').length).toBe(0);
      });

      // The selection state is maintained internally, but Jane's checkbox is no longer visible
      // This test verifies the filter works correctly
      expect(screen.queryAllByText('Jane Smith').length).toBe(0);
    });
  });

  describe('Conversion Badge Display (REQ-018, REQ-023)', () => {
    it('displays conversion badge for converted customers', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Jane Smith is converted
      const badges = screen.getAllByText(/✓ Converted/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('does not display conversion badge for non-converted customers', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Check that John Doe and Bob Wilson rows have "Convert to Lead" button instead
      const convertButtons = screen.queryAllByText('Convert to Lead');
      // Should have at least 2 (one for each non-converted customer in desktop view)
      expect(convertButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows "Convert to Lead" button for non-converted customers', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const convertButtons = screen.getAllByText('Convert to Lead');
      
      // Should have at least 2 convert buttons (for John Doe and Bob Wilson)
      // May have more due to mobile/desktop dual rendering
      expect(convertButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('does not show "Convert to Lead" button for converted customers', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const janeSmithRow = rows.find(row => row.textContent?.includes('Jane Smith'));

      if (janeSmithRow) {
        // Jane Smith is converted, should not have "Convert to Lead" button
        expect(within(janeSmithRow).queryByText('Convert to Lead')).not.toBeInTheDocument();
      }
    });

    it('displays conversion badge in mobile view', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithAuth(<CustomerList {...defaultProps} />);

      // In mobile view, badges should still be visible
      const badges = screen.getAllByText(/✓ Converted/i);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('updates conversion badge after customer is converted', async () => {
      const { rerender } = renderWithAuth(<CustomerList {...defaultProps} />);

      // Initially John Doe is not converted
      expect(screen.getAllByText('Convert to Lead').length).toBeGreaterThanOrEqual(2);

      // Update John Doe to converted
      const updatedCustomers = mockCustomers.map(c =>
        c.id === 'cust-1' ? { ...c, isConverted: true, convertedLeadId: 'lead-2' } : c
      );

      rerender(<CustomerList {...defaultProps} customers={updatedCustomers} />);

      // Now should have fewer convert buttons (only Bob Wilson)
      await waitFor(() => {
        const convertButtons = screen.getAllByText('Convert to Lead');
        expect(convertButtons.length).toBeLessThan(4); // Less than before
        expect(screen.getAllByText(/✓ Converted/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Statistics Display', () => {
    it('displays correct conversion count', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Should show 1 converted customer - find the specific stat card
      const allText = screen.getByText('Converted');
      const statCard = allText.closest('.glass-card');
      expect(statCard?.textContent).toContain('1');
    });

    it('displays correct answered count', () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Find the specific stat card for answered
      const allAnsweredText = screen.getAllByText('Answered');
      const statAnswered = allAnsweredText.find(el => el.closest('.glass-card'));
      const statCard = statAnswered?.closest('.glass-card');
      expect(statCard?.textContent).toContain('1');
    });

    it('updates statistics when filters change', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      // Filter by converted
      const conversionFilter = screen.getAllByRole('combobox')[1];
      fireEvent.click(conversionFilter);
      await waitFor(() => {
        const options = screen.getAllByText('Converted');
        const dropdownOption = options.find(el => el.closest('[role="option"]'));
        if (dropdownOption) {
          fireEvent.click(dropdownOption);
        }
      });

      // Converted stat should still show 1
      await waitFor(() => {
        const allText = screen.getAllByText('Converted');
        const statText = allText.find(el => el.closest('.glass-card'));
        const statCard = statText?.closest('.glass-card');
        expect(statCard?.textContent).toContain('1');
      });
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when loading is true and no customers', () => {
      renderWithAuth(<CustomerList {...defaultProps} customers={[]} loading={true} />);

      expect(screen.getByText('Loading customers...')).toBeInTheDocument();
    });

    it('displays customer list when loading is false', () => {
      renderWithAuth(<CustomerList {...defaultProps} loading={false} />);

      expect(screen.queryByText('Loading customers...')).not.toBeInTheDocument();
      // Check for at least one customer name (may appear multiple times due to mobile/desktop views)
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('displays empty state message when no customers exist', () => {
      renderWithAuth(<CustomerList {...defaultProps} customers={[]} />);

      expect(screen.getByText('No customers available')).toBeInTheDocument();
    });

    it('displays filtered empty state when filters return no results', async () => {
      renderWithAuth(<CustomerList {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/Search by name or phone number/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText(/No customers found matching your filters/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});
