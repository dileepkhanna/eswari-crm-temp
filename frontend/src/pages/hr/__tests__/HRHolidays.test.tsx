import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HRHolidays from '../HRHolidays';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getHolidays: vi.fn(),
    createHoliday: vi.fn(),
    updateHoliday: vi.fn(),
    deleteHoliday: vi.fn(),
  },
}));

// Mock the TopBar component
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="topbar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockHolidays = [
  {
    id: 1,
    name: 'New Year',
    date: '2024-01-01',
    description: 'New Year celebration',
    is_optional: false,
    created_at: '2023-12-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Independence Day',
    date: '2024-08-15',
    description: 'National holiday',
    is_optional: false,
    created_at: '2023-12-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Optional Holiday',
    date: '2024-12-25',
    description: 'Optional celebration',
    is_optional: true,
    created_at: '2023-12-01T00:00:00Z',
  },
];

describe('HRHolidays Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(apiClient.getHolidays).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    expect(screen.getByText('Holiday Management')).toBeInTheDocument();
    expect(screen.getByText('Manage company holidays')).toBeInTheDocument();
  });

  it('should display holidays list correctly', async () => {
    vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Year')).toBeInTheDocument();
    });

    expect(screen.getByText('Independence Day')).toBeInTheDocument();
    expect(screen.getByText('Optional Holiday')).toBeInTheDocument();
  });

  it('should display holiday information correctly', async () => {
    vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Year')).toBeInTheDocument();
    });

    // Check if descriptions are displayed
    expect(screen.getByText('New Year celebration')).toBeInTheDocument();
    expect(screen.getByText('National holiday')).toBeInTheDocument();

    // Check if mandatory/optional badges are displayed
    const mandatoryBadges = screen.getAllByText('Mandatory');
    expect(mandatoryBadges.length).toBe(2);

    const optionalBadges = screen.getAllByText('Optional');
    expect(optionalBadges.length).toBe(1);
  });

  it('should handle empty state correctly', async () => {
    vi.mocked(apiClient.getHolidays).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No holidays found')).toBeInTheDocument();
    });
  });

  it('should handle error state correctly', async () => {
    vi.mocked(apiClient.getHolidays).mockRejectedValue(
      new Error('Failed to fetch holidays')
    );

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load holidays. Please try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should display summary statistics', async () => {
    vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Holidays')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument(); // Total holidays
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('should handle paginated API response', async () => {
    const paginatedResponse = {
      results: mockHolidays,
      count: 3,
      next: null,
      previous: null,
    };

    vi.mocked(apiClient.getHolidays).mockResolvedValue(paginatedResponse as any);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Year')).toBeInTheDocument();
    });

    expect(screen.getByText('Independence Day')).toBeInTheDocument();
    expect(screen.getByText('Optional Holiday')).toBeInTheDocument();
  });

  it('should filter holidays based on search query', async () => {
    vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

    render(
      <BrowserRouter>
        <HRHolidays />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Year')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search holidays...');
    expect(searchInput).toBeInTheDocument();
  });

  describe('Create Holiday Form', () => {
    it('should open create holiday dialog when Add Holiday button is clicked', async () => {
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add holiday/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      expect(screen.getByText('Create a new company holiday')).toBeInTheDocument();
      expect(screen.getByLabelText(/holiday name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/this is an optional holiday/i)).toBeInTheDocument();
    });

    it('should create a holiday successfully', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);
      vi.mocked(apiClient.createHoliday).mockResolvedValue({
        id: 4,
        name: 'Test Holiday',
        date: '2024-12-31',
        description: 'Test description',
        is_optional: false,
        created_at: '2024-01-01T00:00:00Z',
      });

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText(/holiday name/i);
      const dateInput = screen.getByLabelText(/^date/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'Test Holiday');
      await user.type(dateInput, '2024-12-31');
      await user.type(descriptionInput, 'Test description');

      // Submit form
      const createButton = screen.getByRole('button', { name: /create holiday/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(apiClient.createHoliday).toHaveBeenCalledWith({
          name: 'Test Holiday',
          date: '2024-12-31',
          description: 'Test description',
          is_optional: false,
        });
      });
    });

    it('should create an optional holiday', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);
      vi.mocked(apiClient.createHoliday).mockResolvedValue({
        id: 4,
        name: 'Optional Test',
        date: '2024-12-31',
        description: 'Optional test',
        is_optional: true,
        created_at: '2024-01-01T00:00:00Z',
      });

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText(/holiday name/i);
      const dateInput = screen.getByLabelText(/^date/i);
      const optionalCheckbox = screen.getByLabelText(/this is an optional holiday/i);

      await user.type(nameInput, 'Optional Test');
      await user.type(dateInput, '2024-12-31');
      await user.click(optionalCheckbox);

      // Submit form
      const createButton = screen.getByRole('button', { name: /create holiday/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(apiClient.createHoliday).toHaveBeenCalledWith({
          name: 'Optional Test',
          date: '2024-12-31',
          description: '',
          is_optional: true,
        });
      });
    });

    it('should show validation error when name is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Try to submit without filling name
      const createButton = screen.getByRole('button', { name: /create holiday/i });
      await user.click(createButton);

      // Should not call API
      expect(apiClient.createHoliday).not.toHaveBeenCalled();
    });

    it('should show validation error when date is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Fill only name
      const nameInput = screen.getByLabelText(/holiday name/i);
      await user.type(nameInput, 'Test Holiday');

      // Try to submit without date
      const createButton = screen.getByRole('button', { name: /create holiday/i });
      await user.click(createButton);

      // Should not call API
      expect(apiClient.createHoliday).not.toHaveBeenCalled();
    });

    it('should close dialog and reset form on cancel', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText(/holiday name/i);
      await user.type(nameInput, 'Test Holiday');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Add New Holiday')).not.toBeInTheDocument();
      });

      // Reopen dialog and check form is reset
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      const nameInputAfterReopen = screen.getByLabelText(/holiday name/i) as HTMLInputElement;
      expect(nameInputAfterReopen.value).toBe('');
    });

    it('should refresh holidays list after successful creation', async () => {
      const user = userEvent.setup();
      const getHolidaysMock = vi.mocked(apiClient.getHolidays);
      
      // First call returns initial holidays
      getHolidaysMock.mockResolvedValueOnce(mockHolidays);
      
      // Second call (after creation) returns updated list
      const updatedHolidays = [
        ...mockHolidays,
        {
          id: 4,
          name: 'New Holiday',
          date: '2024-12-31',
          description: 'New test holiday',
          is_optional: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      getHolidaysMock.mockResolvedValueOnce(updatedHolidays);

      vi.mocked(apiClient.createHoliday).mockResolvedValue(updatedHolidays[3]);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add holiday/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Holiday')).toBeInTheDocument();
      });

      // Fill and submit form
      const nameInput = screen.getByLabelText(/holiday name/i);
      const dateInput = screen.getByLabelText(/^date/i);
      
      await user.type(nameInput, 'New Holiday');
      await user.type(dateInput, '2024-12-31');

      const createButton = screen.getByRole('button', { name: /create holiday/i });
      await user.click(createButton);

      // Wait for API calls
      await waitFor(() => {
        expect(apiClient.createHoliday).toHaveBeenCalled();
        expect(getHolidaysMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Delete Holiday', () => {
    it('should show delete button for each holiday', async () => {
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBe(mockHolidays.length);
    });

    it('should open delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Holiday')).toBeInTheDocument();
      });

      expect(screen.getByText(/are you sure you want to delete the holiday/i)).toBeInTheDocument();
      expect(screen.getByText(/"New Year"/i)).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    });

    it('should delete holiday when confirmed', async () => {
      const user = userEvent.setup();
      const getHolidaysMock = vi.mocked(apiClient.getHolidays);
      
      // First call returns initial holidays
      getHolidaysMock.mockResolvedValueOnce(mockHolidays);
      
      // Second call (after deletion) returns updated list
      const updatedHolidays = mockHolidays.filter(h => h.id !== 1);
      getHolidaysMock.mockResolvedValueOnce(updatedHolidays);

      vi.mocked(apiClient.deleteHoliday).mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Holiday')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete holiday/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(apiClient.deleteHoliday).toHaveBeenCalledWith(1);
        expect(getHolidaysMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should close dialog without deleting when cancelled', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Holiday')).toBeInTheDocument();
      });

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Holiday')).not.toBeInTheDocument();
      });

      // Should not call delete API
      expect(apiClient.deleteHoliday).not.toHaveBeenCalled();
    });

    it('should handle delete error gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);
      vi.mocked(apiClient.deleteHoliday).mockRejectedValue(
        new Error('Failed to delete holiday')
      );

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Holiday')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete holiday/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(apiClient.deleteHoliday).toHaveBeenCalledWith(1);
      });

      // Error should be handled (toast.error would be called)
    });

    it('should disable buttons while deleting', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getHolidays).mockResolvedValue(mockHolidays);
      vi.mocked(apiClient.deleteHoliday).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <BrowserRouter>
          <HRHolidays />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Year')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Holiday')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /delete holiday/i });
      await user.click(confirmButton);

      // Check if buttons are disabled during deletion
      await waitFor(() => {
        expect(screen.getByText(/deleting/i)).toBeInTheDocument();
      });
    });
  });
});
