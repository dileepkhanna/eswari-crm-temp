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
    start_date: '2024-03-01',
    end_date: '2024-03-03',
    reason: 'Flu',
    status: 'pending',
    created_at: '2024-02-28T10:00:00Z',
  },
  {
    id: 2,
    user: 2,
    user_name: 'Jane Smith',
    leave_type: 'annual',
    start_date: '2024-03-10',
    end_date: '2024-03-15',
    reason: 'Vacation',
    status: 'approved',
    approved_by_name: 'Admin User',
    created_at: '2024-02-25T10:00:00Z',
  },
  {
    id: 3,
    user: 3,
    user_name: 'Bob Wilson',
    leave_type: 'casual',
    start_date: '2024-03-05',
    end_date: '2024-03-05',
    reason: 'Personal work',
    status: 'rejected',
    rejection_reason: 'Insufficient notice',
    created_at: '2024-02-27T10:00:00Z',
  },
  {
    id: 4,
    user: 4,
    user_name: 'Alice Johnson',
    leave_type: 'sick',
    start_date: '2024-03-20',
    end_date: '2024-03-22',
    reason: 'Medical appointment',
    status: 'pending',
    created_at: '2024-03-01T10:00:00Z',
  },
];

describe('HRLeaves - Status Filter', () => {
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

  it('should display all leaves by default (All Status filter)', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // All 4 leaves should be visible
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('should filter leaves by pending status', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on status filter dropdown
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);

    // Select "Pending" option
    const pendingOption = await screen.findByRole('option', { name: /^Pending$/i });
    await user.click(pendingOption);

    // Wait for filter to apply
    await waitFor(() => {
      // Only pending leaves should be visible
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      
      // Approved and rejected leaves should not be visible
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });
  });

  it('should filter leaves by approved status', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on status filter dropdown
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);

    // Select "Approved" option
    const approvedOption = await screen.findByRole('option', { name: /^Approved$/i });
    await user.click(approvedOption);

    // Wait for filter to apply
    await waitFor(() => {
      // Only approved leave should be visible
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      
      // Other leaves should not be visible
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });
  });

  it('should filter leaves by rejected status', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click on status filter dropdown
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);

    // Select "Rejected" option
    const rejectedOption = await screen.findByRole('option', { name: /^Rejected$/i });
    await user.click(rejectedOption);

    // Wait for filter to apply
    await waitFor(() => {
      // Only rejected leave should be visible
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      
      // Other leaves should not be visible
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });
  });

  it('should reset to all leaves when selecting "All Status"', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // First filter by pending
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    const pendingOption = await screen.findByRole('option', { name: /^Pending$/i });
    await user.click(pendingOption);

    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    // Now reset to "All Status"
    await user.click(statusFilter);
    const allStatusOption = await screen.findByRole('option', { name: /All Status/i });
    await user.click(allStatusOption);

    // Wait for filter to reset
    await waitFor(() => {
      // All leaves should be visible again
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  it('should show correct message when no leaves match status filter', async () => {
    const user = userEvent.setup();
    
    // Mock with only pending leaves
    (apiClient.getLeaves as any).mockResolvedValue([
      {
        id: 1,
        user: 1,
        user_name: 'John Doe',
        leave_type: 'sick',
        start_date: '2024-03-01',
        end_date: '2024-03-03',
        reason: 'Flu',
        status: 'pending',
        created_at: '2024-02-28T10:00:00Z',
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Filter by approved (which doesn't exist)
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    const approvedOption = await screen.findByRole('option', { name: /^Approved$/i });
    await user.click(approvedOption);

    // Should show "no leaves found" message
    await waitFor(() => {
      expect(screen.getByText(/No leaves found matching your filters/i)).toBeInTheDocument();
    });
  });

  it('should combine status filter with search query', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Filter by pending status
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    const pendingOption = await screen.findByRole('option', { name: /^Pending$/i });
    await user.click(pendingOption);

    // Search for "Alice"
    const searchInput = screen.getByPlaceholderText(/Search leaves/i);
    await user.type(searchInput, 'Alice');

    // Wait for combined filters to apply
    await waitFor(() => {
      // Only Alice Johnson (pending) should be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      
      // John Doe (pending but doesn't match search) should not be visible
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      
      // Other status leaves should not be visible
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });
  });

  it('should reset pagination to page 1 when status filter changes', async () => {
    const user = userEvent.setup();
    
    // Mock with many leaves to enable pagination
    const manyLeaves = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      user: i + 1,
      user_name: `User ${i + 1}`,
      leave_type: 'sick',
      start_date: '2024-03-01',
      end_date: '2024-03-03',
      reason: 'Test',
      status: i % 2 === 0 ? 'pending' : 'approved',
      created_at: '2024-02-28T10:00:00Z',
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

    // Change status filter
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.click(statusFilter);
    const pendingOption = await screen.findByRole('option', { name: /^Pending$/i });
    await user.click(pendingOption);

    // Should reset to page 1
    await waitFor(() => {
      // Page 1 button should be active
      const page1Button = screen.getByRole('button', { name: '1' });
      expect(page1Button).toHaveClass(/default/); // Active page has "default" variant
    });
  });
});
