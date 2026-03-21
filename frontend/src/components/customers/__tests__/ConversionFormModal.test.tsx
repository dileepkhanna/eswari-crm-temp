import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConversionFormModal from '../ConversionFormModal';
import { Customer } from '@/types';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getConversionForm: vi.fn(),
    convertCustomer: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ConversionFormModal Component', () => {
  const mockCustomer: Customer = {
    id: '1',
    name: 'John Doe',
    phone: '+1234567890',
    callStatus: 'answered',
    customCallStatus: null,
    scheduledDate: null,
    callDate: new Date('2024-01-15'),
    notes: 'Interested in 3BHK apartment',
    isConverted: false,
    convertedLeadId: null,
    company: 1,
    assignedTo: 'user-1',
    createdBy: 'user-1',
    createdByName: 'Admin User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockOnClose = vi.fn();
  const mockOnConversionComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Pre-fill (REQ-029)', () => {
    it('displays pre-filled customer data as read-only', async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {
          name: mockCustomer.name,
          phone: mockCustomer.phone,
          description: mockCustomer.notes,
        },
      });

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      });

      // Verify fields are disabled (read-only)
      const nameInput = screen.getByDisplayValue('John Doe') as HTMLInputElement;
      const phoneInput = screen.getByDisplayValue('+1234567890') as HTMLInputElement;
      
      expect(nameInput.disabled).toBe(true);
      expect(phoneInput.disabled).toBe(true);
    });

    it('loads conversion form data on modal open', async () => {
      const mockFormData = {
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {
          name: mockCustomer.name,
          phone: mockCustomer.phone,
          email: 'john@example.com',
          description: mockCustomer.notes,
        },
      };

      (apiClient.getConversionForm as any).mockResolvedValue(mockFormData);

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(apiClient.getConversionForm).toHaveBeenCalledWith(mockCustomer.id);
      });
    });
  });

  describe('Editable Lead Fields (REQ-030)', () => {
    beforeEach(async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {},
      });
    });

    it('displays all required lead fields', async () => {
      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Address/i)).toBeInTheDocument();
        expect(screen.getByText(/Requirement Type/i)).toBeInTheDocument();
        expect(screen.getByText(/BHK Requirement/i)).toBeInTheDocument();
        expect(screen.getByText(/Budget Range/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Preferred Location/i)).toBeInTheDocument();
        expect(screen.getByText(/^Status/i)).toBeInTheDocument();
        expect(screen.getByText(/Follow-up Date/i)).toBeInTheDocument();
      });
    });

    it('allows editing of lead fields', async () => {
      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
        expect(emailInput).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      
      expect(emailInput.value).toBe('john@example.com');
    });
  });

  describe('Budget Range Validation (REQ-043)', () => {
    beforeEach(async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {},
      });
    });

    it('validates budget_min <= budget_max in real-time', async () => {
      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Budget Range/i)).toBeInTheDocument();
      });

      // Get budget inputs by placeholder
      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      const minInput = budgetInputs[0];
      const maxInput = budgetInputs[1];

      // Set invalid range (min > max)
      fireEvent.change(minInput, { target: { value: '8000000' } });
      fireEvent.change(maxInput, { target: { value: '5000000' } });

      await waitFor(() => {
        expect(screen.getByText(/Minimum budget must be less than or equal to maximum budget/i)).toBeInTheDocument();
      });
    });

    it('disables submit button when budget validation fails', async () => {
      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Budget Range/i)).toBeInTheDocument();
      });

      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      const minInput = budgetInputs[0];
      const maxInput = budgetInputs[1];

      // Set invalid range
      fireEvent.change(minInput, { target: { value: '8000000' } });
      fireEvent.change(maxInput, { target: { value: '5000000' } });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Convert to Lead/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('allows submission when budget range is valid', async () => {
      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Budget Range/i)).toBeInTheDocument();
      });

      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      const minInput = budgetInputs[0];
      const maxInput = budgetInputs[1];

      // Set valid range
      fireEvent.change(minInput, { target: { value: '5000000' } });
      fireEvent.change(maxInput, { target: { value: '8000000' } });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Convert to Lead/i });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission (REQ-028, REQ-045)', () => {
    beforeEach(async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {},
      });
    });

    it('submits conversion with all required fields', async () => {
      const mockLeadResponse = {
        success: true,
        lead: {
          id: '123',
          name: 'John Doe',
          phone: '+1234567890',
          status: 'hot',
        },
        customer: {
          ...mockCustomer,
          isConverted: true,
          convertedLeadId: '123',
        },
      };

      (apiClient.convertCustomer as any).mockResolvedValue(mockLeadResponse);

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Preferred Location/i)).toBeInTheDocument();
      });

      // Fill in required fields
      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      fireEvent.change(budgetInputs[0], { target: { value: '5000000' } });
      fireEvent.change(budgetInputs[1], { target: { value: '8000000' } });

      const locationInput = screen.getByLabelText(/Preferred Location/i);
      fireEvent.change(locationInput, { target: { value: 'Downtown' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Convert to Lead/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiClient.convertCustomer).toHaveBeenCalledWith(
          mockCustomer.id,
          expect.objectContaining({
            requirement_type: 'apartment',
            bhk_requirement: '2',
            budget_min: 5000000,
            budget_max: 8000000,
            preferred_location: 'Downtown',
            status: 'new',
          })
        );
      });
    });

    it('displays validation errors from backend', async () => {
      const mockError = {
        message: 'HTTP error! status: 400, details: {"details":{"budget_max":["Budget max must be greater than budget min"]}}',
      };

      (apiClient.convertCustomer as any).mockRejectedValue(mockError);

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Preferred Location/i)).toBeInTheDocument();
      });

      // Fill in fields
      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      fireEvent.change(budgetInputs[0], { target: { value: '5000000' } });
      fireEvent.change(budgetInputs[1], { target: { value: '8000000' } });

      const locationInput = screen.getByLabelText(/Preferred Location/i);
      fireEvent.change(locationInput, { target: { value: 'Downtown' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Convert to Lead/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Budget max must be greater than budget min/i)).toBeInTheDocument();
      });
    });

    it('calls onConversionComplete after successful conversion', async () => {
      const mockLeadResponse = {
        success: true,
        lead: {
          id: '123',
          name: 'John Doe',
        },
      };

      (apiClient.convertCustomer as any).mockResolvedValue(mockLeadResponse);

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Preferred Location/i)).toBeInTheDocument();
      });

      // Fill in required fields
      const budgetInputs = screen.getAllByPlaceholderText(/Minimum|Maximum/i);
      fireEvent.change(budgetInputs[0], { target: { value: '5000000' } });
      fireEvent.change(budgetInputs[1], { target: { value: '8000000' } });

      const locationInput = screen.getByLabelText(/Preferred Location/i);
      fireEvent.change(locationInput, { target: { value: 'Downtown' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Convert to Lead/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnConversionComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('closes modal when cancel button is clicked', async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {},
      });

      render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form data when modal closes', async () => {
      (apiClient.getConversionForm as any).mockResolvedValue({
        can_convert: true,
        customer: mockCustomer,
        pre_filled: {},
      });

      const { rerender } = render(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      });

      // Fill in some data
      const emailInput = screen.getByLabelText(/Email/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Close and reopen modal
      rerender(
        <ConversionFormModal
          open={false}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      rerender(
        <ConversionFormModal
          open={true}
          onClose={mockOnClose}
          customer={mockCustomer}
          onConversionComplete={mockOnConversionComplete}
        />
      );

      await waitFor(() => {
        const emailInputAfterReopen = screen.getByLabelText(/Email/i) as HTMLInputElement;
        expect(emailInputAfterReopen.value).toBe('');
      });
    });
  });
});
