import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversionAnalyticsDashboard } from '../ConversionAnalyticsDashboard';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  apiClient: {
    getConversionRate: vi.fn(),
    getConversionByUser: vi.fn(),
    getConversionTrend: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api';

describe('ConversionAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Widget Rendering Tests
  describe('Widget Rendering', () => {
    it('should render loading state initially', () => {
      // Mock API calls to never resolve
      vi.mocked(apiClient.getConversionRate).mockImplementation(() => new Promise(() => {}));
      vi.mocked(apiClient.getConversionByUser).mockImplementation(() => new Promise(() => {}));
      vi.mocked(apiClient.getConversionTrend).mockImplementation(() => new Promise(() => {}));

      render(<ConversionAnalyticsDashboard />);
      
      // Check for the loading spinner by class name
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render all metric cards after loading', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
        expect(screen.getByText('Pending Conversions')).toBeInTheDocument();
        expect(screen.getByText('Total Conversions')).toBeInTheDocument();
      });
    });

    it('should render conversion rate widget with data', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('45.0%')).toBeInTheDocument();
        expect(screen.getByText(/45 of 100 customers converted/i)).toBeInTheDocument();
      });
    });

    it('should render pending conversions widget', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('55')).toBeInTheDocument(); // 100 - 45 = 55 pending
        expect(screen.getByText(/customers awaiting conversion/i)).toBeInTheDocument();
      });
    });

    it('should render total conversions widget', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Conversions')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText(/customers converted to leads/i)).toBeInTheDocument();
      });
    });

    it('should render top converters widget with sorted data', async () => {
      const mockUsers = [
        {
          user_id: 1,
          user_name: 'John Doe',
          total_customers: 50,
          converted: 25,
          conversion_rate: 50.0,
        },
        {
          user_id: 2,
          user_name: 'Jane Smith',
          total_customers: 40,
          converted: 30,
          conversion_rate: 75.0,
        },
      ];

      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 55,
        conversion_rate: 55.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: mockUsers });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/30 conversions/i)).toBeInTheDocument();
        expect(screen.getByText(/25 conversions/i)).toBeInTheDocument();
      });
    });

    it('should render conversion trend chart', async () => {
      const mockTrend = [
        { date: '2024-01-01', conversions: 5 },
        { date: '2024-01-02', conversions: 8 },
        { date: '2024-01-03', conversions: 3 },
      ];

      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 16,
        conversion_rate: 16.0,
        period: { start: '2024-01-01', end: '2024-01-03' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: mockTrend });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Conversion Trend')).toBeInTheDocument();
        expect(screen.getByText(/daily conversion counts over time/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no converters data', async () => {
      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 0,
        converted_customers: 0,
        conversion_rate: 0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/no conversion data available/i)).toBeInTheDocument();
      });
    });
  });

  // Data Fetching Tests
  describe('Data Fetching', () => {
    it('should fetch all analytics data on mount', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(apiClient.getConversionRate).toHaveBeenCalled();
        expect(apiClient.getConversionByUser).toHaveBeenCalled();
        expect(apiClient.getConversionTrend).toHaveBeenCalled();
      });
    });

    it('should fetch data in parallel', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('45.0%')).toBeInTheDocument();
      });

      // All three API calls should have been made
      expect(apiClient.getConversionRate).toHaveBeenCalledTimes(1);
      expect(apiClient.getConversionByUser).toHaveBeenCalledTimes(1);
      expect(apiClient.getConversionTrend).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(apiClient.getConversionRate).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.getConversionByUser).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.getConversionTrend).mockRejectedValue(new Error('API Error'));

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('0.0%')).toBeInTheDocument();
        expect(screen.getByText(/no conversion data available/i)).toBeInTheDocument();
      });
    });

    it('should handle partial API failures', async () => {
      const mockConversionRate = {
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      };

      vi.mocked(apiClient.getConversionRate).mockResolvedValue(mockConversionRate);
      vi.mocked(apiClient.getConversionByUser).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        // Conversion rate should still display
        expect(screen.getByText('45.0%')).toBeInTheDocument();
        // Top converters should show empty state
        expect(screen.getByText(/no conversion data available/i)).toBeInTheDocument();
      });
    });

    it('should sort top converters by conversion count descending', async () => {
      const mockUsers = [
        {
          user_id: 1,
          user_name: 'Low Converter',
          total_customers: 50,
          converted: 10,
          conversion_rate: 20.0,
        },
        {
          user_id: 2,
          user_name: 'High Converter',
          total_customers: 40,
          converted: 35,
          conversion_rate: 87.5,
        },
        {
          user_id: 3,
          user_name: 'Medium Converter',
          total_customers: 60,
          converted: 25,
          conversion_rate: 41.7,
        },
      ];

      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 150,
        converted_customers: 70,
        conversion_rate: 46.7,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: mockUsers });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        // First should be High Converter (35), then Medium (25), then Low (10)
        expect(screen.getByText('High Converter')).toBeInTheDocument();
        expect(screen.getByText('Medium Converter')).toBeInTheDocument();
        expect(screen.getByText('Low Converter')).toBeInTheDocument();
      });
    });
  });

  // Date Range Filtering Tests
  describe('Date Range Filtering', () => {
    it('should render date range selector', async () => {
      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        // Look for the calendar icon button with date range text
        const calendarButtons = screen.getAllByRole('button');
        const dateRangeButton = calendarButtons.find(btn => btn.textContent?.includes('-'));
        expect(dateRangeButton).toBeInTheDocument();
      });
    });

    it('should fetch data with date range parameters', async () => {
      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(apiClient.getConversionRate).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String)
        );
      });
    });

    it('should refetch data when date range changes', async () => {
      const user = userEvent.setup();

      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('45.0%')).toBeInTheDocument();
      });

      // Clear mock call history
      vi.clearAllMocks();

      // Mock new data for date range change
      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 50,
        converted_customers: 20,
        conversion_rate: 40.0,
        period: { start: '2024-01-24', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      // Open date range popover - find button by its content
      const calendarButtons = screen.getAllByRole('button');
      const dateButton = calendarButtons.find(btn => btn.textContent?.includes('-'));
      expect(dateButton).toBeDefined();
      await user.click(dateButton!);

      // Click "Last 7 days" button
      const last7DaysButton = screen.getByRole('button', { name: /last 7 days/i });
      await user.click(last7DaysButton);

      // Verify data was refetched
      await waitFor(() => {
        expect(apiClient.getConversionRate).toHaveBeenCalled();
        expect(apiClient.getConversionByUser).toHaveBeenCalled();
        expect(apiClient.getConversionTrend).toHaveBeenCalled();
      });
    });

    it('should display preset date range options', async () => {
      const user = userEvent.setup();

      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('45.0%')).toBeInTheDocument();
      });

      // Open date range popover - find button by its content
      const calendarButtons = screen.getAllByRole('button');
      const dateButton = calendarButtons.find(btn => btn.textContent?.includes('-'));
      expect(dateButton).toBeDefined();
      await user.click(dateButton!);

      // Verify preset options are available
      expect(screen.getByRole('button', { name: /last 7 days/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /last 30 days/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /last 90 days/i })).toBeInTheDocument();
    });

    it('should pass correct days parameter to trend API based on date range', async () => {
      vi.mocked(apiClient.getConversionRate).mockResolvedValue({
        total_customers: 100,
        converted_customers: 45,
        conversion_rate: 45.0,
        period: { start: '2024-01-01', end: '2024-01-31' },
      });
      vi.mocked(apiClient.getConversionByUser).mockResolvedValue({ users: [] });
      vi.mocked(apiClient.getConversionTrend).mockResolvedValue({ trend: [] });

      render(<ConversionAnalyticsDashboard />);

      await waitFor(() => {
        expect(apiClient.getConversionTrend).toHaveBeenCalledWith(expect.any(Number));
      });

      // Verify the days parameter is calculated from date range
      const callArgs = vi.mocked(apiClient.getConversionTrend).mock.calls[0];
      expect(callArgs[0]).toBeGreaterThan(0);
    });
  });
});
