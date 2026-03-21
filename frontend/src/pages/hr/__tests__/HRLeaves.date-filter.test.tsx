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
    start_date: '2024-02-20',
    end_date: '2024-02-22',
    reason: 'Personal work',
    status: 'approved',
    created_at: '2024-02-15T10:00:00Z',
  },
  {
    id: 3,
    user: 3,
    user_name: 'Bob Wilson',
    leave_type: 'annual',
    start_date: '2024-03-10',
    end_date: '2024-03-15',
    reason: 'Vacation',
    status: 'pending',
    created_at: '2024-03-05T10:00:00Z',
  },
  {
    id: 4,
    user: 4,
    user_name: 'Alice Brown',
    leave_type: 'sick',
    start_date: '2024-04-05',
    end_date: '2024-04-06',
    reason: 'Medical appointment',
    status: 'rejected',
    rejection_reason: 'Insufficient leave balance',
    created_at: '2024-04-01T10:00:00Z',
  },
];

describe('HRLeaves - Date Range Filter', () => {
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

  it('should display date range filter inputs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check for date filter labels
    expect(screen.getByText('Start Date (From)')).toBeInTheDocument();
    expect(screen.getByText('End Date (To)')).toBeInTheDocument();

    // Check for date inputs
    const startDateInput = screen.getByLabelText('Start Date (From)');
    const endDateInput = screen.getByLabelText('End Date (To)');

    expect(startDateInput).toBeInTheDocument();
    expect(endDateInput).toBeInTheDocument();
    expect(startDateInput).toHaveAttribute('type', 'date');
    expect(endDateInput).toHaveAttribute('type', 'date');
  });

  it('should filter leaves by start date', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Initially all 4 leaves should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();

    // Filter by start date (from Feb 1, 2024)
    const startDateInput = screen.getByLabelText('Start Date (From)');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');

    // Should show leaves that end on or after Feb 1, 2024
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // ends Jan 17
      expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // ends Feb 22
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument(); // ends Mar 15
      expect(screen.getByText('Alice Brown')).toBeInTheDocument(); // ends Apr 6
    });
  });

  it('should filter leaves by end date', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Filter by end date (to Feb 28, 2024)
    const endDateInput = screen.getByLabelText('End Date (To)');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-02-28');

    // Should show leaves that start on or before Feb 28, 2024
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument(); // starts Jan 15
      expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // starts Feb 20
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument(); // starts Mar 10
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument(); // starts Apr 5
    });
  });

  it('should filter leaves by date range (both start and end)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Filter by date range (Feb 1 to Mar 31, 2024)
    const startDateInput = screen.getByLabelText('Start Date (From)');
    const endDateInput = screen.getByLabelText('End Date (To)');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-03-31');

    // Should show leaves that overlap with Feb 1 - Mar 31
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // Jan 15-17 (before range)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument(); // Feb 20-22 (in range)
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument(); // Mar 10-15 (in range)
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument(); // Apr 5-6 (after range)
    });
  });

  it('should show "Clear Dates" button when date filters are applied', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Initially no "Clear Dates" button
    expect(screen.queryByText('Clear Dates')).not.toBeInTheDocument();

    // Apply start date filter
    const startDateInput = screen.getByLabelText('Start Date (From)');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');

    // "Clear Dates" button should appear
    await waitFor(() => {
      expect(screen.getByText('Clear Dates')).toBeInTheDocument();
    });
  });

  it('should clear date filters when "Clear Dates" button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Apply date filters
    const startDateInput = screen.getByLabelText('Start Date (From)') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date (To)') as HTMLInputElement;

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-02-28');

    // Verify filters are applied
    expect(startDateInput.value).toBe('2024-02-01');
    expect(endDateInput.value).toBe('2024-02-28');

    // Click "Clear Dates" button
    const clearButton = screen.getByText('Clear Dates');
    await user.click(clearButton);

    // Verify filters are cleared
    await waitFor(() => {
      expect(startDateInput.value).toBe('');
      expect(endDateInput.value).toBe('');
    });

    // All leaves should be visible again
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
  });

  it('should combine date range filter with other filters', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Apply date range filter
    const startDateInput = screen.getByLabelText('Start Date (From)');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');

    // Apply status filter
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    
    const pendingOption = await screen.findByRole('option', { name: /pending/i });
    await user.click(pendingOption);

    // Should show only pending leaves after Feb 1
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument(); // Jan (before range)
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // approved
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument(); // pending + in range
      expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument(); // rejected
    });
  });

  it('should show "No leaves found" message when date filter returns no results', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Apply date range that excludes all leaves
    const startDateInput = screen.getByLabelText('Start Date (From)');
    const endDateInput = screen.getByLabelText('End Date (To)');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2025-01-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2025-12-31');

    // Should show no results message
    await waitFor(() => {
      expect(screen.getByText(/no leaves found matching your filters/i)).toBeInTheDocument();
    });

    // No leaves should be visible
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
  });

  it('should reset pagination when date filters change', async () => {
    const user = userEvent.setup();
    
    // Create more leaves to test pagination
    const manyLeaves = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      user: i + 1,
      user_name: `User ${i + 1}`,
      leave_type: 'casual',
      start_date: `2024-0${Math.floor(i / 10) + 1}-${(i % 10) + 10}`,
      end_date: `2024-0${Math.floor(i / 10) + 1}-${(i % 10) + 12}`,
      reason: 'Test leave',
      status: 'pending',
      created_at: '2024-01-01T10:00:00Z',
    }));

    (apiClient.getLeaves as any).mockResolvedValue(manyLeaves);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Navigate to page 2
    const page2Button = screen.getByRole('button', { name: '2' });
    await user.click(page2Button);

    await waitFor(() => {
      expect(screen.getByText('User 11')).toBeInTheDocument();
    });

    // Apply date filter
    const startDateInput = screen.getByLabelText('Start Date (From)');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');

    // Should reset to page 1
    await waitFor(() => {
      const page1Button = screen.getByRole('button', { name: '1' });
      expect(page1Button).toHaveClass(/default/); // Active page styling
    });
  });

  it('should handle overlapping leave periods correctly', async () => {
    const user = userEvent.setup();
    
    const overlappingLeaves = [
      {
        id: 1,
        user: 1,
        user_name: 'User 1',
        leave_type: 'casual',
        start_date: '2024-01-15',
        end_date: '2024-02-05', // Overlaps with filter range
        reason: 'Test',
        status: 'pending',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        id: 2,
        user: 2,
        user_name: 'User 2',
        leave_type: 'casual',
        start_date: '2024-02-25',
        end_date: '2024-03-10', // Overlaps with filter range
        reason: 'Test',
        status: 'pending',
        created_at: '2024-02-01T10:00:00Z',
      },
      {
        id: 3,
        user: 3,
        user_name: 'User 3',
        leave_type: 'casual',
        start_date: '2024-01-01',
        end_date: '2024-01-10', // Before filter range
        reason: 'Test',
        status: 'pending',
        created_at: '2024-01-01T10:00:00Z',
      },
    ];

    (apiClient.getLeaves as any).mockResolvedValue(overlappingLeaves);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Filter by date range (Feb 1 to Feb 28)
    const startDateInput = screen.getByLabelText('Start Date (From)');
    const endDateInput = screen.getByLabelText('End Date (To)');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-02-01');
    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-02-28');

    // Should show leaves that overlap with the range
    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument(); // Ends in Feb
      expect(screen.getByText('User 2')).toBeInTheDocument(); // Starts in Feb
      expect(screen.queryByText('User 3')).not.toBeInTheDocument(); // Completely before range
    });
  });
});
