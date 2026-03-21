import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkConversionModal from '../BulkConversionModal';
import { apiClient } from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    bulkConvertCustomers: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('BulkConversionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConversionComplete = vi.fn();
  const selectedCustomerIds = ['1', '2', '3'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct customer count', () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    expect(screen.getByText('Bulk Convert Customers to Leads')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Customer count
  });

  it('displays all required form fields', () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    expect(screen.getByText(/Requirement Type/)).toBeInTheDocument();
    expect(screen.getByText(/BHK Requirement/)).toBeInTheDocument();
    expect(screen.getByText(/Budget Range/)).toBeInTheDocument();
    expect(screen.getByText(/Status/)).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Clear budget fields
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '' } });
    fireEvent.change(budgetMaxInput, { target: { value: '' } });

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Minimum budget is required')).toBeInTheDocument();
      expect(screen.getByText('Maximum budget is required')).toBeInTheDocument();
    });

    expect(apiClient.bulkConvertCustomers).not.toHaveBeenCalled();
  });

  it('validates budget range (min <= max)', async () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '5000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '3000000' } });

    await waitFor(() => {
      expect(screen.getByText(/Minimum budget must be less than or equal to maximum budget/)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 3,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill in form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.bulkConvertCustomers).toHaveBeenCalledWith(
        selectedCustomerIds,
        expect.objectContaining({
          requirement_type: 'apartment',
          bhk_requirement: '2',
          budget_min: 3000000,
          budget_max: 5000000,
          status: 'warm',
        })
      );
    });

    await waitFor(() => {
      expect(mockOnConversionComplete).toHaveBeenCalled();
    });
  });

  it('displays conversion results after successful submission', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 2,
        skipped_count: 1,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // success_count
      expect(screen.getByText('1')).toBeInTheDocument(); // skipped_count
      expect(screen.getByText('0')).toBeInTheDocument(); // error_count
    });
  });

  it('displays error details when conversions fail', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 1,
        skipped_count: 0,
        error_count: 2,
        errors: [
          { customer_id: '2', error: 'Already converted' },
          { customer_id: '3', error: 'Invalid phone number' },
        ],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error Details')).toBeInTheDocument();
      expect(screen.getByText('Already converted')).toBeInTheDocument();
      expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel button is clicked', () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('resets form when "Convert More" is clicked', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 3,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
    });

    // Click "Convert More"
    const convertMoreButton = screen.getByRole('button', { name: /Convert More/ });
    fireEvent.click(convertMoreButton);

    // Should show form again
    await waitFor(() => {
      expect(screen.getByText('Default Lead Values')).toBeInTheDocument();
    });
  });

  // REQ-038: Test default values application
  it('applies all default values correctly when submitting', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 3,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill budget fields (required)
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    // Submit with default values
    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    // Verify default values are applied
    await waitFor(() => {
      expect(apiClient.bulkConvertCustomers).toHaveBeenCalledWith(
        selectedCustomerIds,
        expect.objectContaining({
          requirement_type: 'apartment', // default
          bhk_requirement: '2', // default
          budget_min: 3000000,
          budget_max: 5000000,
          status: 'warm', // default
        })
      );
    });
  });

  // REQ-040: Test summary display with mixed results
  it('displays accurate summary with mixed success, skipped, and errors', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 10,
        success_count: 6,
        skipped_count: 2,
        error_count: 2,
        errors: [
          { customer_id: '5', error: 'Invalid phone format' },
          { customer_id: '8', error: 'Phone already exists as lead' },
        ],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 10 Customer\(s\)/ });
    fireEvent.click(submitButton);

    // Verify summary counts
    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
      expect(screen.getByText('Converted')).toBeInTheDocument();
      expect(screen.getByText('Skipped')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
    });

    // Verify error details are shown
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone format')).toBeInTheDocument();
    expect(screen.getByText('Phone already exists as lead')).toBeInTheDocument();
  });

  // REQ-040: Test summary display with all errors
  it('displays summary when all conversions fail', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 0,
        skipped_count: 0,
        error_count: 3,
        errors: [
          { customer_id: '1', error: 'Already converted' },
          { customer_id: '2', error: 'Invalid data' },
          { customer_id: '3', error: 'Permission denied' },
        ],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockResolvedValue(mockResponse);

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
    });

    // Verify all errors are displayed
    expect(screen.getByText('Already converted')).toBeInTheDocument();
    expect(screen.getByText('Invalid data')).toBeInTheDocument();
    expect(screen.getByText('Permission denied')).toBeInTheDocument();
  });

  // Test error handling for API failures
  it('handles API errors gracefully', async () => {
    (apiClient.bulkConvertCustomers as any).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.bulkConvertCustomers).toHaveBeenCalled();
    });

    // Should not show results screen on error
    expect(screen.queryByText('Conversion Complete')).not.toBeInTheDocument();
  });

  // Test empty selection handling
  it('prevents submission with empty customer selection', async () => {
    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={[]}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /Convert 0 Customer\(s\)/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.bulkConvertCustomers).not.toHaveBeenCalled();
    });
  });

  // Test progress indicator during submission
  it('shows progress indicator during conversion', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 3,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockResponse), 100);
      });
    });

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByText('Converting...')).toBeInTheDocument();
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
    });
  });

  // Test that submit button is disabled during submission
  it('disables submit button during conversion', async () => {
    const mockResponse = {
      success: true,
      summary: {
        total: 3,
        success_count: 3,
        skipped_count: 0,
        error_count: 0,
        errors: [],
      },
    };

    (apiClient.bulkConvertCustomers as any).mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockResponse), 100);
      });
    });

    render(
      <BulkConversionModal
        open={true}
        onClose={mockOnClose}
        selectedCustomerIds={selectedCustomerIds}
        onConversionComplete={mockOnConversionComplete}
      />
    );

    // Fill and submit form
    const budgetMinInput = screen.getByPlaceholderText('Minimum');
    const budgetMaxInput = screen.getByPlaceholderText('Maximum');
    fireEvent.change(budgetMinInput, { target: { value: '3000000' } });
    fireEvent.change(budgetMaxInput, { target: { value: '5000000' } });

    const submitButton = screen.getByRole('button', { name: /Convert 3 Customer\(s\)/ });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Conversion Complete')).toBeInTheDocument();
    });
  });
});
