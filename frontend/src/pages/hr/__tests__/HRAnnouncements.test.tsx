import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HRAnnouncements from '../HRAnnouncements';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getAnnouncements: vi.fn(),
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
  },
}));

// Mock the UI components
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ title, subtitle }: any) => (
    <div data-testid="topbar">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

describe('HRAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiClient.getAnnouncements).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<HRAnnouncements />);
    
    expect(screen.getByText('Announcement Management')).toBeInTheDocument();
    expect(screen.getByText('Manage company announcements')).toBeInTheDocument();
  });

  it('displays announcements after successful fetch', async () => {
    const mockAnnouncements = [
      {
        id: 1,
        title: 'Test Announcement',
        message: 'This is a test message',
        priority: 'high',
        target_roles: ['admin', 'manager'],
        created_by: 1,
        created_by_name: 'Admin User',
        created_at: '2024-01-01T00:00:00Z',
        is_active: true,
      },
    ];

    vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

    render(<HRAnnouncements />);

    await waitFor(() => {
      expect(screen.getByText('Test Announcement')).toBeInTheDocument();
    });

    expect(screen.getByText('This is a test message')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    vi.mocked(apiClient.getAnnouncements).mockRejectedValue(
      new Error('Failed to fetch')
    );

    render(<HRAnnouncements />);

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load announcements. Please try again.')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays empty state when no announcements', async () => {
    vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);

    render(<HRAnnouncements />);

    await waitFor(() => {
      expect(screen.getByText('No announcements found')).toBeInTheDocument();
    });
  });

  it('handles paginated response format', async () => {
    const mockResponse = {
      results: [
        {
          id: 1,
          title: 'Paginated Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: ['employee'],
          created_by: 1,
          created_by_name: 'Test User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ],
      count: 1,
      next: null,
      previous: null,
    };

    vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockResponse as any);

    render(<HRAnnouncements />);

    await waitFor(() => {
      expect(screen.getByText('Paginated Announcement')).toBeInTheDocument();
    });
  });

  it('displays all announcement fields correctly', async () => {
    const mockAnnouncements = [
      {
        id: 1,
        title: 'Complete Announcement',
        message: 'Full message content',
        priority: 'low',
        target_roles: ['admin', 'hr', 'manager'],
        created_by: 1,
        created_by_name: 'John Doe',
        created_at: '2024-01-15T10:30:00Z',
        expires_at: '2024-12-31T23:59:59Z',
        is_active: false,
      },
    ];

    vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

    render(<HRAnnouncements />);

    await waitFor(() => {
      expect(screen.getByText('Complete Announcement')).toBeInTheDocument();
    });

    expect(screen.getByText('By John Doe')).toBeInTheDocument();
    expect(screen.getByText('Full message content')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  describe('Create Announcement Form', () => {
    it('opens create dialog when Create Announcement button is clicked', async () => {
      vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);

      const { container } = render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.queryByText('No announcements found')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('Create Announcement')).toBeInTheDocument();
      expect(screen.getByLabelText('Title *')).toBeInTheDocument();
      expect(screen.getByLabelText('Message *')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority *')).toBeInTheDocument();
    });

    it('validates required fields before submission', async () => {
      vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.queryByText('No announcements found')).toBeInTheDocument();
      });

      // Open dialog
      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getAllByText('Create Announcement').find(
        (el) => el.tagName === 'BUTTON'
      );
      submitButton?.click();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please enter an announcement title');
      });
    });

    it('creates announcement successfully with valid data', async () => {
      vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);
      vi.mocked(apiClient.createAnnouncement).mockResolvedValue({
        id: 1,
        title: 'New Announcement',
        message: 'Test message',
        priority: 'high',
        target_roles: ['admin'],
        created_by: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_active: true,
      });
      const { toast } = await import('sonner');

      const { container } = render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.queryByText('No announcements found')).toBeInTheDocument();
      });

      // Open dialog
      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Fill in form
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;

      titleInput.value = 'New Announcement';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));

      messageInput.value = 'Test message';
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = screen.getAllByText('Create Announcement').find(
        (el) => el.tagName === 'BUTTON'
      );
      submitButton?.click();

      await waitFor(() => {
        expect(apiClient.createAnnouncement).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Announcement',
            message: 'Test message',
            priority: 'medium',
          })
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Announcement created successfully');
      });
    });

    it('handles role selection correctly', async () => {
      vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.queryByText('No announcements found')).toBeInTheDocument();
      });

      // Open dialog
      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Check role checkboxes
      const adminCheckbox = screen.getByLabelText('Admin') as HTMLInputElement;
      const hrCheckbox = screen.getByLabelText('HR') as HTMLInputElement;

      expect(adminCheckbox.checked).toBe(false);
      expect(hrCheckbox.checked).toBe(false);

      adminCheckbox.click();
      hrCheckbox.click();

      expect(adminCheckbox.checked).toBe(true);
      expect(hrCheckbox.checked).toBe(true);
    });

    it('handles API errors during creation', async () => {
      vi.mocked(apiClient.getAnnouncements).mockResolvedValue([]);
      vi.mocked(apiClient.createAnnouncement).mockRejectedValue(
        new Error('API Error')
      );
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.queryByText('No announcements found')).toBeInTheDocument();
      });

      // Open dialog
      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Fill in form
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;

      titleInput.value = 'Test';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));

      messageInput.value = 'Test message';
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = screen.getAllByText('Create Announcement').find(
        (el) => el.tagName === 'BUTTON'
      );
      submitButton?.click();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create announcement');
      });
    });
  });

  describe('Edit Announcement Form', () => {
    it('opens edit dialog when Edit button is clicked', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Existing Announcement',
          message: 'Existing message',
          priority: 'high',
          target_roles: ['admin'],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          expires_at: '2024-12-31T23:59:59Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Existing Announcement')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' }); // Edit icon button
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('Edit Announcement')).toBeInTheDocument();
      expect(screen.getByText('Update the announcement details below.')).toBeInTheDocument();
    });

    it('populates form with existing announcement data', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Existing Announcement',
          message: 'Existing message',
          priority: 'high',
          target_roles: ['admin', 'hr'],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          expires_at: '2024-12-31T23:59:59Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Existing Announcement')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' });
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Check that form is populated
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;

      expect(titleInput.value).toBe('Existing Announcement');
      expect(messageInput.value).toBe('Existing message');
    });

    it('updates announcement successfully with valid data', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Old Title',
          message: 'Old message',
          priority: 'low',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);
      vi.mocked(apiClient.updateAnnouncement).mockResolvedValue({
        id: 1,
        title: 'Updated Title',
        message: 'Updated message',
        priority: 'high',
        target_roles: ['admin'],
        created_by: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_active: true,
      });
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Old Title')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' });
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Update form fields
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;

      titleInput.value = 'Updated Title';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));

      messageInput.value = 'Updated message';
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit form
      const submitButton = screen.getByText('Update Announcement');
      submitButton.click();

      await waitFor(() => {
        expect(apiClient.updateAnnouncement).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: 'Updated Title',
            message: 'Updated message',
          })
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Announcement updated successfully');
      });
    });

    it('validates required fields before update', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' });
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Clear title field
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Try to submit
      const submitButton = screen.getByText('Update Announcement');
      submitButton.click();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please enter an announcement title');
      });
    });

    it('handles API errors during update', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);
      vi.mocked(apiClient.updateAnnouncement).mockRejectedValue(
        new Error('API Error')
      );
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: '' });
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByText('Update Announcement');
      submitButton.click();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update announcement');
      });
    });

    it('resets form when dialog is closed', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'high',
          target_roles: ['admin'],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Open edit dialog
      const editButton = screen.getByRole('button', { name: '' });
      editButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Close dialog
      const cancelButton = screen.getByText('Cancel');
      cancelButton.click();

      // Open create dialog
      const createButton = screen.getByText('Create Announcement');
      createButton.click();

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
      });

      // Check that form is empty
      const titleInput = screen.getByLabelText('Title *') as HTMLInputElement;
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;

      expect(titleInput.value).toBe('');
      expect(messageInput.value).toBe('');
    });
  });

  describe('Delete Announcement', () => {
    it('opens delete confirmation dialog when Delete button is clicked', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click delete button (second button in actions column)
      const buttons = screen.getAllByRole('button', { name: '' });
      const deleteButton = buttons[1]; // First is edit, second is delete
      deleteButton.click();

      await waitFor(() => {
        expect(screen.getByText('Delete Announcement')).toBeInTheDocument();
      });

      expect(screen.getByText('Are you sure you want to delete this announcement? This action cannot be undone.')).toBeInTheDocument();
    });

    it('deletes announcement successfully when confirmed', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);
      vi.mocked(apiClient.deleteAnnouncement).mockResolvedValue(undefined);
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click delete button
      const buttons = screen.getAllByRole('button', { name: '' });
      const deleteButton = buttons[1];
      deleteButton.click();

      await waitFor(() => {
        expect(screen.getByText('Delete Announcement')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      confirmButton.click();

      await waitFor(() => {
        expect(apiClient.deleteAnnouncement).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Announcement deleted successfully');
      });
    });

    it('closes delete dialog when Cancel is clicked', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click delete button
      const buttons = screen.getAllByRole('button', { name: '' });
      const deleteButton = buttons[1];
      deleteButton.click();

      await waitFor(() => {
        expect(screen.getByText('Delete Announcement')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButtons = screen.getAllByText('Cancel');
      const deleteCancelButton = cancelButtons[cancelButtons.length - 1]; // Last cancel button
      deleteCancelButton.click();

      // Dialog should close (no longer in document)
      await waitFor(() => {
        expect(screen.queryByText('Are you sure you want to delete this announcement?')).not.toBeInTheDocument();
      });

      // Announcement should still be visible
      expect(screen.getByText('Test Announcement')).toBeInTheDocument();
    });

    it('handles API errors during deletion', async () => {
      const mockAnnouncements = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      vi.mocked(apiClient.getAnnouncements).mockResolvedValue(mockAnnouncements);
      vi.mocked(apiClient.deleteAnnouncement).mockRejectedValue(
        new Error('API Error')
      );
      const { toast } = await import('sonner');

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click delete button
      const buttons = screen.getAllByRole('button', { name: '' });
      const deleteButton = buttons[1];
      deleteButton.click();

      await waitFor(() => {
        expect(screen.getByText('Delete Announcement')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      confirmButton.click();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete announcement');
      });
    });

    it('refreshes announcement list after successful deletion', async () => {
      const mockAnnouncementsInitial = [
        {
          id: 1,
          title: 'Test Announcement',
          message: 'Test message',
          priority: 'medium',
          target_roles: [],
          created_by: 1,
          created_by_name: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      const mockAnnouncementsAfterDelete: any[] = [];

      vi.mocked(apiClient.getAnnouncements)
        .mockResolvedValueOnce(mockAnnouncementsInitial)
        .mockResolvedValueOnce(mockAnnouncementsAfterDelete);
      vi.mocked(apiClient.deleteAnnouncement).mockResolvedValue(undefined);

      render(<HRAnnouncements />);

      await waitFor(() => {
        expect(screen.getByText('Test Announcement')).toBeInTheDocument();
      });

      // Click delete button
      const buttons = screen.getAllByRole('button', { name: '' });
      const deleteButton = buttons[1];
      deleteButton.click();

      await waitFor(() => {
        expect(screen.getByText('Delete Announcement')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      confirmButton.click();

      await waitFor(() => {
        expect(apiClient.getAnnouncements).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.getByText('No announcements found')).toBeInTheDocument();
      });
    });
  });
});
