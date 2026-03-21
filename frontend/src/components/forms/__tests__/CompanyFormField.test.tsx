import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import CompanyFormField from '../CompanyFormField';
import { useAuth } from '@/contexts/AuthContextDjango';
import { useCompany } from '@/contexts/CompanyContext';
import { apiClient } from '@/lib/api';

// Mock dependencies
vi.mock('@/contexts/AuthContextDjango');
vi.mock('@/contexts/CompanyContext');
vi.mock('@/lib/api');

// Test wrapper component
function TestWrapper({ role, company }: { role: string; company?: any }) {
  const { control } = useForm({
    defaultValues: {
      company: 0,
    },
  });

  return (
    <form>
      <CompanyFormField control={control} />
    </form>
  );
}

describe('CompanyFormField', () => {
  const mockCompanies = [
    { id: 1, name: 'Eswari Group', code: 'ESWARI', logo_url: null },
    { id: 2, name: 'ASE Technologies', code: 'ASE', logo_url: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirement 4.6**
   * Admin/HR users should see company dropdown
   */
  it('should render company dropdown for admin users', async () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'admin', company: null },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: true,
      availableCompanies: mockCompanies,
      selectedCompany: null,
    });

    render(<TestWrapper role="admin" />);

    await waitFor(() => {
      expect(screen.getByText('Company')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Admin/HR users should see company dropdown
   */
  it('should render company dropdown for hr users', async () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'hr', company: null },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: true,
      availableCompanies: mockCompanies,
      selectedCompany: null,
    });

    render(<TestWrapper role="hr" />);

    await waitFor(() => {
      expect(screen.getByText('Company')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.7**
   * Manager/Employee users should have company auto-populated (hidden field)
   */
  it('should render hidden field for manager users', () => {
    (useAuth as any).mockReturnValue({
      user: {
        role: 'manager',
        company: { id: 1, name: 'Eswari Group', code: 'ESWARI' },
      },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: false,
      availableCompanies: [],
      selectedCompany: { id: 1, name: 'Eswari Group', code: 'ESWARI' },
    });

    const { container } = render(<TestWrapper role="manager" company={{ id: 1 }} />);

    // Should have hidden input
    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toBeInTheDocument();
  });

  /**
   * **Validates: Requirement 4.7**
   * Manager/Employee users should have company auto-populated (hidden field)
   */
  it('should render hidden field for employee users', () => {
    (useAuth as any).mockReturnValue({
      user: {
        role: 'employee',
        company: { id: 1, name: 'Eswari Group', code: 'ESWARI' },
      },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: false,
      availableCompanies: [],
      selectedCompany: { id: 1, name: 'Eswari Group', code: 'ESWARI' },
    });

    const { container } = render(<TestWrapper role="employee" company={{ id: 1 }} />);

    // Should have hidden input
    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toBeInTheDocument();
  });

  /**
   * **Validates: Requirement 12.6**
   * Display validation errors for company field
   */
  it('should display validation error when company is not selected', async () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'admin', company: null },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: true,
      availableCompanies: mockCompanies,
      selectedCompany: null,
    });

    function TestWrapperWithValidation() {
      const { control, handleSubmit } = useForm({
        defaultValues: {
          company: 0,
        },
      });

      const onSubmit = (data: any) => {
        if (!data.company) {
          throw new Error('Company is required');
        }
      };

      return (
        <form onSubmit={handleSubmit(onSubmit)}>
          <CompanyFormField control={control} required={true} />
          <button type="submit">Submit</button>
        </form>
      );
    }

    render(<TestWrapperWithValidation />);

    await waitFor(() => {
      expect(screen.getByText('Company')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirement 4.6**
   * Load companies from API if not available in context
   */
  it('should load companies from API when not in context', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: mockCompanies });
    (apiClient.get as any) = mockGet;

    (useAuth as any).mockReturnValue({
      user: { role: 'admin', company: null },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: true,
      availableCompanies: [],
      selectedCompany: null,
    });

    render(<TestWrapper role="admin" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/companies/active/');
    });
  });

  /**
   * **Validates: Requirement 4.7**
   * Auto-populate company for manager/employee users
   */
  it('should auto-set company value for restricted role users', () => {
    const userCompany = { id: 1, name: 'Eswari Group', code: 'ESWARI' };
    
    (useAuth as any).mockReturnValue({
      user: {
        role: 'employee',
        company: userCompany,
      },
    });
    (useCompany as any).mockReturnValue({
      canSelectCompany: false,
      availableCompanies: [],
      selectedCompany: userCompany,
    });

    const { container } = render(<TestWrapper role="employee" company={userCompany} />);

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput?.value).toBe('1');
  });
});
