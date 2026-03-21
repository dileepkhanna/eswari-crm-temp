import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import HRDashboard from '../HRDashboard';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getHRDashboardMetrics: vi.fn(),
    getActivityLogs: vi.fn(),
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

// Mock the StatCard component
vi.mock('@/components/dashboard/StatCard', () => ({
  default: ({ title, value, href }: { title: string; value: number; href: string }) => (
    <div data-testid="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>
      <a href={href}>View</a>
    </div>
  ),
}));

// Mock the AnnouncementBanner component
vi.mock('@/components/announcements/AnnouncementBanner', () => ({
  default: ({ userRole }: { userRole: string }) => (
    <div data-testid="announcement-banner">
      Announcements for {userRole}
    </div>
  ),
}));

const mockMetrics = {
  total_employees: 150,
  pending_leaves: 12,
  upcoming_holidays: 5,
  active_announcements: 3,
};

const mockActivities = {
  results: [
    {
      id: 1,
      user_name: 'John Doe',
      user_role: 'hr',
      module: 'users',
      action: 'created',
      details: 'new employee Sarah Smith',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: 2,
      user_name: 'Jane Smith',
      user_role: 'hr',
      module: 'leaves',
      action: 'approved',
      details: 'leave request for Bob Wilson',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  ],
};

describe('HRDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard title and subtitle', () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(apiClient.getActivityLogs).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('HR Dashboard')).toBeInTheDocument();
    expect(screen.getByText("Welcome back! Here's your HR overview.")).toBeInTheDocument();
  });

  it('renders announcement banner with correct role', () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(apiClient.getActivityLogs).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId('announcement-banner')).toBeInTheDocument();
    expect(screen.getByText('Announcements for hr')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(apiClient.getActivityLogs).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    // Should show loading skeleton
    const loadingElements = screen.getAllByRole('generic').filter(
      el => el.className.includes('animate-pulse')
    );
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays dashboard metrics correctly', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });

    // Check all stat cards are rendered
    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Pending Leaves')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Holidays')).toBeInTheDocument();
    expect(screen.getByText('Active Announcements')).toBeInTheDocument();

    // Check metric values
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays quick action buttons after data loads', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    // Check all quick action buttons
    expect(screen.getByText('Manage Employees')).toBeInTheDocument();
    expect(screen.getByText('Review Leaves')).toBeInTheDocument();
    expect(screen.getByText('Add Holiday')).toBeInTheDocument();
    expect(screen.getByText('Create Announcement')).toBeInTheDocument();
  });

  it('displays recent activity feed', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Check activity items are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('created')).toBeInTheDocument();
    expect(screen.getByText('new employee Sarah Smith')).toBeInTheDocument();

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('leave request for Bob Wilson')).toBeInTheDocument();
  });

  it('displays error state when metrics API call fails', async () => {
    const errorMessage = 'Failed to load dashboard metrics';
    vi.mocked(apiClient.getHRDashboardMetrics).mockRejectedValue(
      new Error(errorMessage)
    );
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no activities are available', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue({ results: [] });

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('No recent activity to display')).toBeInTheDocument();
  });

  it('handles activity logs API failure gracefully', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockRejectedValue(
      new Error('Failed to load recent activities')
    );

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Metrics should still be displayed
    expect(screen.getByText('Total Employees')).toBeInTheDocument();

    // Activity error should be shown
    expect(screen.getByText('Failed to load recent activities')).toBeInTheDocument();
  });

  it('formats time ago correctly', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Check time formatting
    expect(screen.getByText(/hours ago/)).toBeInTheDocument();
    expect(screen.getByText(/days ago/)).toBeInTheDocument();
  });

  it('retries fetching metrics when retry button is clicked', async () => {
    const errorMessage = 'Failed to load dashboard metrics';
    vi.mocked(apiClient.getHRDashboardMetrics).mockRejectedValueOnce(
      new Error(errorMessage)
    );
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard')).toBeInTheDocument();
    });

    // Mock successful response for retry
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);

    // Click retry button
    const retryButton = screen.getByText('Retry');
    retryButton.click();

    await waitFor(() => {
      expect(screen.getByText('Total Employees')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('handles non-paginated activity response', async () => {
    vi.mocked(apiClient.getHRDashboardMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(apiClient.getActivityLogs).mockResolvedValue(mockActivities.results);

    render(
      <BrowserRouter>
        <HRDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Activities should still be displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});
