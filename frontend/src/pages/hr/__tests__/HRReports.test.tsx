import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HRReports from '../HRReports';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getEmployeeStatistics: vi.fn(),
    getLeaveStatistics: vi.fn(),
  },
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

const mockEmployeeStats = {
  total_employees: 150,
  by_role: [
    { role: 'admin', count: 5 },
    { role: 'manager', count: 20 },
    { role: 'employee', count: 120 },
    { role: 'hr', count: 5 },
  ],
  with_manager: 120,
  without_manager: 30,
};

const mockLeaveStats = {
  total_leaves: 85,
  by_status: [
    { status: 'pending', count: 12 },
    { status: 'approved', count: 60 },
    { status: 'rejected', count: 13 },
  ],
  by_type: [
    { leave_type: 'sick', count: 25 },
    { leave_type: 'casual', count: 30 },
    { leave_type: 'annual', count: 20 },
    { leave_type: 'other', count: 10 },
  ],
  pending_count: 12,
};

describe('HRReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    expect(screen.getByText('HR Reports')).toBeInTheDocument();
  });

  it('displays employee statistics correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    // Check overview cards
    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('With Manager')).toBeInTheDocument();
    expect(screen.getByText('Without Manager')).toBeInTheDocument();
    expect(screen.getByText('Manager Coverage')).toBeInTheDocument();

    // Check specific values
    expect(screen.getByText('120')).toBeInTheDocument(); // with_manager
    expect(screen.getByText('30')).toBeInTheDocument(); // without_manager
    
    // Check manager coverage percentage (120/150 = 80%)
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('displays employees by role correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employees by Role')).toBeInTheDocument();
    });

    // Check role labels
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();

    // Check role counts
    expect(screen.getByText('5 employees')).toBeInTheDocument(); // admin
    expect(screen.getByText('20 employees')).toBeInTheDocument(); // manager
    expect(screen.getByText('120 employees')).toBeInTheDocument(); // employee
  });

  it('displays error state when API call fails', async () => {
    const errorMessage = 'Failed to load employee statistics';
    vi.mocked(apiClient.getEmployeeStatistics).mockRejectedValue(
      new Error(errorMessage)
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Statistics')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calculates percentages correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employees by Role')).toBeInTheDocument();
    });

    // Admin: 5/150 = 3.3%
    expect(screen.getByText('3.3%')).toBeInTheDocument();
    
    // Manager: 20/150 = 13.3%
    expect(screen.getByText('13.3%')).toBeInTheDocument();
    
    // Employee: 120/150 = 80.0%
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('handles empty statistics gracefully', async () => {
    const emptyStats = {
      total_employees: 0,
      by_role: [],
      with_manager: 0,
      without_manager: 0,
    };

    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(emptyStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue({
      total_leaves: 0,
      by_status: [],
      by_type: [],
      pending_count: 0,
    });

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    // Should show 0% for manager coverage
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // Leave Statistics Tests
  it('displays leave statistics correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Leave Overview')).toBeInTheDocument();
    });

    // Check leave overview cards
    expect(screen.getByText('Total Leaves')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    // Check specific values
    expect(screen.getByText('85')).toBeInTheDocument(); // total_leaves
    expect(screen.getByText('12')).toBeInTheDocument(); // pending_count
    expect(screen.getByText('60')).toBeInTheDocument(); // approved
    expect(screen.getByText('13')).toBeInTheDocument(); // rejected
  });

  it('displays leaves by status correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaves by Status')).toBeInTheDocument();
    });

    // Check status counts
    expect(screen.getByText('12 leaves')).toBeInTheDocument(); // pending
    expect(screen.getByText('60 leaves')).toBeInTheDocument(); // approved
    expect(screen.getByText('13 leaves')).toBeInTheDocument(); // rejected

    // Check percentages
    // Pending: 12/85 = 14.1%
    expect(screen.getByText('14.1%')).toBeInTheDocument();
    // Approved: 60/85 = 70.6%
    expect(screen.getByText('70.6%')).toBeInTheDocument();
    // Rejected: 13/85 = 15.3%
    expect(screen.getByText('15.3%')).toBeInTheDocument();
  });

  it('displays leaves by type correctly', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Leaves by Type')).toBeInTheDocument();
    });

    // Check type labels
    expect(screen.getByText('Sick Leave')).toBeInTheDocument();
    expect(screen.getByText('Casual Leave')).toBeInTheDocument();
    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();

    // Check type counts
    expect(screen.getByText('25 leaves')).toBeInTheDocument(); // sick
    expect(screen.getByText('30 leaves')).toBeInTheDocument(); // casual
    expect(screen.getByText('20 leaves')).toBeInTheDocument(); // annual
    expect(screen.getByText('10 leaves')).toBeInTheDocument(); // other

    // Check percentages
    // Sick: 25/85 = 29.4%
    expect(screen.getByText('29.4%')).toBeInTheDocument();
    // Casual: 30/85 = 35.3%
    expect(screen.getByText('35.3%')).toBeInTheDocument();
    // Annual: 20/85 = 23.5%
    expect(screen.getByText('23.5%')).toBeInTheDocument();
    // Other: 10/85 = 11.8%
    expect(screen.getByText('11.8%')).toBeInTheDocument();
  });

  it('handles leave statistics API failure gracefully', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockRejectedValue(
      new Error('Failed to load leave statistics')
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Overview')).toBeInTheDocument();
    });

    // Employee stats should still be displayed
    expect(screen.getByText('150')).toBeInTheDocument();

    // Leave stats should not be displayed
    expect(screen.queryByText('Leave Overview')).not.toBeInTheDocument();
  });

  it('does not display leave statistics when data is null', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(null as any);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Overview')).toBeInTheDocument();
    });

    // Leave sections should not be displayed
    expect(screen.queryByText('Leave Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Leaves by Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Leaves by Type')).not.toBeInTheDocument();
  });

  // Refresh Functionality Tests
  it('displays refresh button after data loads', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });

    // Clear previous calls
    vi.clearAllMocks();

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Data');
    refreshButton.click();

    await waitFor(() => {
      expect(apiClient.getEmployeeStatistics).toHaveBeenCalledTimes(1);
      expect(apiClient.getLeaveStatistics).toHaveBeenCalledTimes(1);
    });
  });

  it('shows refreshing state when refresh button is clicked', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockLeaveStats), 100))
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Data');
    refreshButton.click();

    // Should show refreshing state
    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    // Should return to normal state after refresh completes
    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });
  });

  it('disables refresh button while refreshing', async () => {
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockLeaveStats), 100))
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh Data') as HTMLButtonElement;
    refreshButton.click();

    // Button should be disabled while refreshing
    await waitFor(() => {
      const refreshingButton = screen.getByText('Refreshing...') as HTMLButtonElement;
      expect(refreshingButton.disabled).toBe(true);
    });
  });

  it('updates error message to use refresh handler', async () => {
    const errorMessage = 'Failed to load employee statistics';
    vi.mocked(apiClient.getEmployeeStatistics).mockRejectedValue(
      new Error(errorMessage)
    );

    render(
      <BrowserRouter>
        <HRReports />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Statistics')).toBeInTheDocument();
    });

    // Clear previous calls
    vi.clearAllMocks();

    // Mock successful response for retry
    vi.mocked(apiClient.getEmployeeStatistics).mockResolvedValue(mockEmployeeStats);
    vi.mocked(apiClient.getLeaveStatistics).mockResolvedValue(mockLeaveStats);

    // Click retry button
    const retryButton = screen.getByText('Retry');
    retryButton.click();

    await waitFor(() => {
      expect(apiClient.getEmployeeStatistics).toHaveBeenCalledTimes(1);
      expect(apiClient.getLeaveStatistics).toHaveBeenCalledTimes(1);
    });
  });
});
