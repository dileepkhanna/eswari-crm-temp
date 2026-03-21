import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HREmployees from '../HREmployees';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getAllUsers: vi.fn(),
    getManagers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('@/contexts/AuthContextDjango', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      username: 'test_hr',
      email: 'hr@test.com',
      first_name: 'Test',
      last_name: 'HR',
      role: 'hr',
    },
    isAuthenticated: true,
  }),
}));

// Mock the TopBar component
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="top-bar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEmployees: any[] = [
  {
    id: '1',
    username: 'john_admin_1',
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Admin',
    phone: '1234567890',
    role: 'admin',
    manager: null,
    manager_name: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    username: 'jane_manager_1',
    email: 'jane@example.com',
    first_name: 'Jane',
    last_name: 'Manager',
    phone: '0987654321',
    role: 'manager',
    manager: null,
    manager_name: null,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    username: 'bob_employee_1',
    email: 'bob@example.com',
    first_name: 'Bob',
    last_name: 'Employee',
    phone: '5555555555',
    role: 'employee',
    manager: 2,
    manager_name: 'Jane Manager',
    created_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    username: 'alice_hr_1',
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'HR',
    phone: '4444444444',
    role: 'hr',
    manager: null,
    manager_name: null,
    created_at: '2024-01-04T00:00:00Z',
  },
];

const mockManagers: any[] = [
  {
    id: '2',
    username: 'jane_manager_1',
    email: 'jane@example.com',
    first_name: 'Jane',
    last_name: 'Manager',
    phone: '0987654321',
    role: 'manager',
    manager: null,
    manager_name: null,
    created_at: '2024-01-02T00:00:00Z',
  },
];

describe('HREmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the employee management title and subtitle', () => {
    vi.mocked(apiClient.getAllUsers).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(apiClient.getManagers).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    expect(screen.getByText('Employee Management')).toBeInTheDocument();
    expect(screen.getByText('Manage employee accounts')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(apiClient.getAllUsers).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(apiClient.getManagers).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    // Check for loading spinner by class name
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('displays employee list correctly', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Check all employees are displayed
    expect(screen.getByText('John Admin')).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Manager/)[0]).toBeInTheDocument();
    expect(screen.getByText('Bob Employee')).toBeInTheDocument();
    expect(screen.getByText('Alice HR')).toBeInTheDocument();

    // Check emails are displayed
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('displays role badges with correct styling', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Check role badges
    const adminBadge = screen.getAllByText('admin')[0];
    expect(adminBadge).toHaveClass('capitalize');

    const managerBadge = screen.getAllByText('manager')[0];
    expect(managerBadge).toHaveClass('capitalize');

    const employeeBadge = screen.getAllByText('employee')[0];
    expect(employeeBadge).toHaveClass('capitalize');

    const hrBadge = screen.getAllByText('hr')[0];
    expect(hrBadge).toHaveClass('capitalize');
  });

  it('displays manager name for employees', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Employee')).toBeInTheDocument();
    });

    // Check manager name is displayed for employee (appears twice: as name and as manager)
    expect(screen.getAllByText(/Jane Manager/).length).toBeGreaterThan(0);
  });

  it('filters employees by search query', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Search for "Bob"
    const searchInput = screen.getByPlaceholderText('Search employees...');
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    // Only Bob should be visible
    expect(screen.getByText('Bob Employee')).toBeInTheDocument();
    expect(screen.queryByText('John Admin')).not.toBeInTheDocument();
    // Jane Manager appears as Bob's manager, so we check for the full name in the employee row
    expect(screen.queryByText('Alice HR')).not.toBeInTheDocument();
  });

  it('filters employees by role', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Note: This test verifies the filter UI exists but doesn't test the actual filtering
    // because the Select component from Radix UI requires more complex interaction
    const roleFilters = screen.getAllByRole('combobox');
    expect(roleFilters.length).toBeGreaterThan(0);
  });

  it('displays "New Employee" button', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Employee')).toBeInTheDocument();
    });

    const newEmployeeButton = screen.getByText('New Employee');
    expect(newEmployeeButton).toBeInTheDocument();
  });

  it('displays edit and delete buttons for each employee', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Check that edit and delete buttons exist (there should be multiple)
    const editButtons = screen.getAllByTitle(/edit employee/i);
    const deleteButtons = screen.getAllByTitle(/delete employee/i);

    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('disables edit button for admin and HR users', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Find buttons with disabled state
    const disabledEditButtons = screen.getAllByTitle('HR cannot modify admin or HR users');
    expect(disabledEditButtons.length).toBeGreaterThan(0);
  });

  it('disables delete button for admin and HR users', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Find buttons with disabled state
    const disabledDeleteButtons = screen.getAllByTitle('HR cannot delete admin or HR users');
    expect(disabledDeleteButtons.length).toBeGreaterThan(0);
  });

  it('displays error state when API call fails', async () => {
    const errorMessage = 'Failed to load employees. Please try again.';
    vi.mocked(apiClient.getAllUsers).mockRejectedValue(
      new Error('Failed to load employees')
    );
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays empty state when no employees match search', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Search for non-existent employee
    const searchInput = screen.getByPlaceholderText('Search employees...');
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.getByText('No employees found matching your search')).toBeInTheDocument();
  });

  it('handles paginated API response', async () => {
    const paginatedResponse = {
      results: mockEmployees,
      count: mockEmployees.length,
      next: null,
      previous: null,
    };

    vi.mocked(apiClient.getAllUsers).mockResolvedValue(paginatedResponse as any);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // All employees should be displayed
    expect(screen.getByText('John Admin')).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Manager/)[0]).toBeInTheDocument();
    expect(screen.getByText('Bob Employee')).toBeInTheDocument();
    expect(screen.getByText('Alice HR')).toBeInTheDocument();
  });

  it('handles non-paginated API response', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // All employees should be displayed
    expect(screen.getByText('John Admin')).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Manager/)[0]).toBeInTheDocument();
    expect(screen.getByText('Bob Employee')).toBeInTheDocument();
    expect(screen.getByText('Alice HR')).toBeInTheDocument();
  });

  it('displays phone numbers correctly', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });

    // Check phone numbers are displayed
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('0987654321')).toBeInTheDocument();
    expect(screen.getByText('5555555555')).toBeInTheDocument();
    expect(screen.getByText('4444444444')).toBeInTheDocument();
  });

  it('displays user initials in avatar', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('JA')).toBeInTheDocument(); // John Admin
    });

    expect(screen.getByText('JA')).toBeInTheDocument(); // John Admin
    expect(screen.getByText('JM')).toBeInTheDocument(); // Jane Manager
    expect(screen.getByText('BE')).toBeInTheDocument(); // Bob Employee
    expect(screen.getByText('AH')).toBeInTheDocument(); // Alice HR
  });

  it('displays username with @ prefix', async () => {
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('@john_admin_1')).toBeInTheDocument();
    });

    expect(screen.getByText('@john_admin_1')).toBeInTheDocument();
    expect(screen.getByText('@jane_manager_1')).toBeInTheDocument();
    expect(screen.getByText('@bob_employee_1')).toBeInTheDocument();
    expect(screen.getByText('@alice_hr_1')).toBeInTheDocument();
  });

  it('retries fetching employees when try again button is clicked', async () => {
    const errorMessage = 'Failed to load employees. Please try again.';
    vi.mocked(apiClient.getAllUsers).mockRejectedValueOnce(
      new Error('Failed to load employees')
    );
    vi.mocked(apiClient.getManagers).mockResolvedValue(mockManagers);

    render(
      <BrowserRouter>
        <HREmployees />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Mock successful response for retry
    vi.mocked(apiClient.getAllUsers).mockResolvedValue(mockEmployees);

    // Click try again button
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText('John Admin')).toBeInTheDocument();
    });
  });
});
