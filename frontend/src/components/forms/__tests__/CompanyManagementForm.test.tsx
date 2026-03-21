import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanyManagementForm from '../CompanyManagementForm';
import type { Company } from '@/types';

describe('CompanyManagementForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const mockCompany: Company = {
    id: 1,
    name: 'Eswari Group',
    code: 'ESWARI',
    logo_url: 'https://example.com/logo.png',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirement 4.6**
   * Company create form should have name, code, and logo fields
   */
  it('should render create form with all required fields', () => {
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Create New Company')).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Code/i)).toBeInTheDocument();
    expect(screen.getByText('Company Logo')).toBeInTheDocument();
    expect(screen.getByText('Active Status')).toBeInTheDocument();
  });

  /**
   * **Validates: Requirement 4.6**
   * Company edit form should load existing company data
   */
  it('should render edit form with company data', async () => {
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        company={mockCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Company')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Company Name/i) as HTMLInputElement;
    const codeInput = screen.getByLabelText(/Company Code/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Eswari Group');
    expect(codeInput.value).toBe('ESWARI');
  });

  /**
   * **Validates: Requirement 4.6**
   * Logo upload field should support image preview
   */
  it('should display logo preview when company has logo', async () => {
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        company={mockCompany}
      />
    );

    await waitFor(() => {
      const logoImage = screen.getByAltText('Company logo preview') as HTMLImageElement;
      expect(logoImage).toBeInTheDocument();
      expect(logoImage.src).toContain('example.com/logo.png');
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Logo upload should support file selection and preview
   */
  it('should allow logo file upload and show preview', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Create a mock file
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    
    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Simulate file selection
    await user.upload(fileInput, file);

    // Preview should be displayed
    await waitFor(() => {
      const preview = screen.getByAltText('Company logo preview');
      expect(preview).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 12.6**
   * Display validation errors for company fields
   */
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Try to submit without filling fields
    const submitButton = screen.getByText('Create Company');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Company name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Company code must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 12.6**
   * Company code should be uppercase and alphanumeric
   */
  it('should auto-format company code to uppercase', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const codeInput = screen.getByLabelText(/Company Code/i) as HTMLInputElement;
    
    await user.type(codeInput, 'test_code');

    expect(codeInput.value).toBe('TEST_CODE');
  });

  /**
   * **Validates: Requirement 12.6**
   * Company code should reject invalid characters
   */
  it('should reject invalid characters in company code', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const codeInput = screen.getByLabelText(/Company Code/i) as HTMLInputElement;
    
    await user.type(codeInput, 'test-code!@#');

    // Should only keep valid characters
    expect(codeInput.value).toBe('TESTCODE');
  });

  /**
   * **Validates: Requirement 4.6**
   * Form should submit with FormData for multipart upload
   */
  it('should submit form with FormData', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
    await user.type(screen.getByLabelText(/Company Code/i), 'TEST');

    // Submit
    const submitButton = screen.getByText('Create Company');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      const formData = mockOnSubmit.mock.calls[0][0];
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Logo file size validation
   */
  it('should reject logo files larger than 5MB', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Create a mock file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, largeFile);

    // Should show error toast (we can't easily test toast, but file shouldn't be set)
    await waitFor(() => {
      const preview = screen.queryByAltText('Company logo preview');
      expect(preview).not.toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Logo file type validation
   */
  it('should reject non-image files', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    // Create a non-image file
    const textFile = new File(['text'], 'file.txt', { type: 'text/plain' });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, textFile);

    // Should show error and not display preview
    await waitFor(() => {
      const preview = screen.queryByAltText('Company logo preview');
      expect(preview).not.toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Remove logo functionality
   */
  it('should allow removing selected logo', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        company={mockCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByAltText('Company logo preview')).toBeInTheDocument();
    });

    // Find and click remove button
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(removeButton);

    // Logo preview should be removed
    await waitFor(() => {
      expect(screen.queryByAltText('Company logo preview')).not.toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Company code should be disabled in edit mode
   */
  it('should disable company code field in edit mode', () => {
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        company={mockCompany}
      />
    );

    const codeInput = screen.getByLabelText(/Company Code/i) as HTMLInputElement;
    expect(codeInput).toBeDisabled();
  });

  /**
   * **Validates: Requirement 4.6**
   * Active status toggle
   */
  it('should allow toggling active status', async () => {
    const user = userEvent.setup();
    
    render(
      <CompanyManagementForm
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const activeSwitch = screen.getByRole('switch');
    expect(activeSwitch).toBeChecked(); // Default is true

    await user.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
  });
});
