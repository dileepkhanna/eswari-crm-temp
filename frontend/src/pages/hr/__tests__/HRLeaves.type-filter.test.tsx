import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HRLeaves from '../HRLeaves';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getLeaves: vi.fn(),
    approveLeave: vi.fn(),
    rejectLeave: vi.fn(),
    deleteLeave: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockLeaves = [
  {
    id: 1,
    user: 1,
    user_name: 'John Doe',
    leave_type: 'sick',
    start_date: '2024-01-15',
    end_date: '2024-01-17',
    reason: 'Flu',
    status: 'pending',
    created_at: '2024-01-10T10:00:00Z',
  },
  {
    id: 2,
    user: 2,
    user_name: 'Jane Smith',
    leave_type: 'casual',
    start_date: '2024-01-20',
    end_date: '2024-01-22',
    reason: 'Personal work',
    status: 'approved',
    created_at: '2024-01-12T10:00:00Z',
  },
  {
    id: 3,
    user: 3,
    user_name: 'Bob Wilson',
    leave_type: 'annual',
    start_date: '2024-02-01',
    end_date: '2024-02-10',
    reason: 'Vacation',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 4,
    user: 4,
    user_name: 'Alice Brown',
    leave_type: 'other',
    start_date: '2024-01-25',
    end_date: '2024-01-26',
    reason: 'Family emergency',
    status: 'rejected',
    rejection_reason: 'Insufficient notice',
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 5,
    user: 5,
    user_name: 'Charlie Davis',
    leave_type: 'sick',
    start_date: '2024-01-18',
    end_date: '2024-01-19',
    reason: 'Medical appointment',
    status: 'approved',
    created_at: '2024-01-14T10:00:00Z',
  },
];

describe('HRLeaves - Type Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getLeaves as any).mockResolvedValue(mockLeaves);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <HRLeaves />
      </BrowserRouter>
    );
  };

  it('should display all leaves by default (All Types filter)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // All 5 leaves should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
  });

  it('should filter leaves by sick type', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the type filter dropdown
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);

    // Select "Sick Leave" option
    const sickOption = await screen.findByRole('option', { name: /sick leave/i });
    await user.click(sickOption);

    // Wait for filtering to apply
    await waitFor(() => {
      // Should show only sick leaves (John Doe and Charlie Davis)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
      
      // Should not show other types
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    });
  });

  it('should filter leaves by casual type', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the type filter dropdown
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);

    // Select "Casual Leave" option
    const casualOption = await screen.findByRole('option', { name: /casual leave/i });
    await user.click(casualOption);

    // Wait for filtering to apply
    await waitFor(() => {
      // Should show only casual leave (Jane Smith)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // Should not show other types
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Davis')).not.toBeInTheDocument();
    });
  });

  it('should filter leaves by annual type', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the type filter dropdown
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);

    // Select "Annual Leave" option
    const annualOption = await screen.findByRole('option', { name: /annual leave/i });
    await user.click(annualOption);

    // Wait for filtering to apply
    await waitFor(() => {
      // Should show only annual leave (Bob Wilson)
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      
      // Should not show other types
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Davis')).not.toBeInTheDocument();
    });
  });

  it('should filter leaves by other type', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the type filter dropdown
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);

    // Select "Other" option
    const otherOption = await screen.findByRole('option', { name: /^other$/i });
    await user.click(otherOption);

    // Wait for filtering to apply
    await waitFor(() => {
      // Should show only other type (Alice Brown)
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      
      // Should not show other types
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Davis')).not.toBeInTheDocument();
    });
  });

  it('should reset to show all leaves when "All Types" is selected', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // First, filter by sick leave
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);
    const sickOption = await screen.findByRole('option', { name: /sick leave/i });
    await user.click(sickOption);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    // Now reset to "All Types"
    await user.click(typeFilterButton);
    const allTypesOption = await screen.findByRole('option', { name: /all types/i });
    await user.click(allTypesOption);

    // Wait for all leaves to be visible again
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
    });
  });

  it('should combine type filter with status filter', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Filter by sick type
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);
    const sickOption = await screen.findByRole('option', { name: /sick leave/i });
    await user.click(sickOption);

    // Filter by approved status
    const statusFilterButton = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilterButton);
    const approvedOption = await screen.findByRole('option', { name: /^approved$/i });
    await user.click(approvedOption);

    // Wait for combined filtering to apply
    await waitFor(() => {
      // Should show only approved sick leaves (Charlie Davis)
      expect(screen.getByText('Charlie Davis')).toBeInTheDocument();
      
      // Should not show other leaves
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // sick but pending
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // casual and approved
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    });
  });

  it('should show "no leaves found" message when type filter has no matches', async () => {
    const user = userEvent.setup();
    
    // Mock with leaves that don't have a specific type
    (apiClient.getLeaves as any).mockResolvedValue([
      {
        id: 1,
        user: 1,
        user_name: 'John Doe',
        leave_type: 'sick',
        start_date: '2024-01-15',
        end_date: '2024-01-17',
        reason: 'Flu',
        status: 'pending',
        created_at: '2024-01-10T10:00:00Z',
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Filter by annual type (which doesn't exist in the data)
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);
    const annualOption = await screen.findByRole('option', { name: /annual leave/i });
    await user.click(annualOption);

    // Wait for "no leaves found" message
    await waitFor(() => {
      expect(screen.getByText(/no leaves found matching your filters/i)).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should display correct leave type badges', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check that all leave type badges are displayed
    const sickBadges = screen.getAllByText('sick');
    expect(sickBadges.length).toBeGreaterThan(0);

    const casualBadges = screen.getAllByText('casual');
    expect(casualBadges.length).toBeGreaterThan(0);

    const annualBadges = screen.getAllByText('annual');
    expect(annualBadges.length).toBeGreaterThan(0);

    const otherBadges = screen.getAllByText('other');
    expect(otherBadges.length).toBeGreaterThan(0);
  });

  it('should reset pagination when type filter changes', async () => {
    const user = userEvent.setup();
    
    // Mock with many leaves to trigger pagination
    const manyLeaves = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      user: i + 1,
      user_name: `User ${i + 1}`,
      leave_type: i % 2 === 0 ? 'sick' : 'casual',
      start_date: '2024-01-15',
      end_date: '2024-01-17',
      reason: 'Test reason',
      status: 'pending',
      created_at: '2024-01-10T10:00:00Z',
    }));

    (apiClient.getLeaves as any).mockResolvedValue(manyLeaves);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    // Go to page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    await user.click(page2Button);

    await waitFor(() => {
      expect(screen.getByText('User 11')).toBeInTheDocument();
    });

    // Apply type filter
    const typeFilterButton = screen.getByRole('combobox', { name: /filter by type/i });
    await user.click(typeFilterButton);
    const sickOption = await screen.findByRole('option', { name: /sick leave/i });
    await user.click(sickOption);

    // Should reset to page 1
    await waitFor(() => {
      // Page 1 button should be active (or not visible if only 1 page)
      const page1Button = screen.queryByRole('button', { name: '1' });
      if (page1Button) {
        expect(page1Button).toHaveClass(/default/); // Active page styling
      }
    });
  });
});
