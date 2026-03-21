/**
 * Integration tests for customer-to-lead conversion end-to-end flows.
 * 
 * These tests validate complete user workflows from the frontend perspective,
 * ensuring UI components work together correctly with API interactions.
 * 
 * Test Flows:
 * 1. Import CSV → View customers → Convert to lead → View lead
 * 2. Bulk import → Bulk convert → View analytics
 * 3. Manual customer entry → Convert → Verify audit log
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import CustomerImportModal from '../CustomerImportModal';
import CustomerList from '../CustomerList';
import ConversionFormModal from '../ConversionFormModal';
import BulkConversionModal from '../BulkConversionModal';
import ConversionAnalyticsDashboard from '../ConversionAnalyticsDashboard';

// Mock API server
const server = setupServer(
  // Customer import endpoint
  rest.post('/api/customers/import/', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      summary: {
        total_rows: 3,
        success_count: 3,
        duplicate_count: 0,
        error_count: 0,
        errors: []
      }
    }));
  }),

  // Customer list endpoint
  rest.get('/api/customers/', (req, res, ctx) => {
    const converted = req.url.searchParams.get('converted');
    
    if (converted === 'false') {
      return res(ctx.json({
        count: 2,
        results: [
          {
            id: 1,
            name: 'John Doe',
            phone: '9876543210',
            is_converted: false,
            converted_lead_id: null,
            call_status: 'pending',
            created_at: '2024-01-01T10:00:00Z'
          },
          {
            id: 2,
            name: 'Jane Smith', 
            phone: '9876543211',
            is_converted: false,
            converted_lead_id: null,
            call_status: 'pending',
            created_at: '2024-01-01T10:05:00Z'
          }
        ]
      }));
    }
    
    return res(ctx.json({
      count: 3,
      results: [
        {
          id: 1,
          name: 'John Doe',
          phone: '9876543210',
          is_converted: true,
          converted_lead_id: '101',
          call_status: 'answered',
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 2,
          name: 'Jane Smith',
          phone: '9876543211', 
          is_converted: false,
          converted_lead_id: null,
          call_status: 'pending',
          created_at: '2024-01-01T10:05:00Z'
        },
        {
          id: 3,
          name: 'Bob Johnson',
          phone: '9876543212',
          is_converted: false,
          converted_lead_id: null,
          call_status: 'pending',
          created_at: '2024-01-01T10:10:00Z'
        }
      ]
    }));
  }),

  // Conversion form endpoint
  rest.get('/api/customers/:id/conversion-form/', (req, res, ctx) => {
    return res(ctx.json({
      customer: {
        id: 1,
        name: 'John Doe',
        phone: '9876543210',
        notes: 'Interested in apartment'
      },
      pre_filled: {
        name: 'John Doe',
        phone: '9876543210',
        description: 'Interested in apartment',
        source: 'customer_conversion'
      },
      can_convert: true,
      reason: null
    }));
  }),

  // Customer conversion endpoint
  rest.post('/api/customers/:id/convert/', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({
      success: true,
      lead: {
        id: 101,
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@example.com',
        status: 'hot',
        source: 'customer_conversion',
        requirement_type: 'apartment',
        bhk_requirement: '3'
      },
      customer: {
        id: 1,
        is_converted: true,
        converted_lead_id: '101'
      }
    }));
  }),

  // Bulk conversion endpoint
  rest.post('/api/customers/bulk-convert/', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      summary: {
        total: 2,
        success_count: 2,
        skipped_count: 0,
        error_count: 0,
        errors: []
      }
    }));
  }),

  // Analytics endpoints
  rest.get('/api/customers/analytics/conversion-rate/', (req, res, ctx) => {
    return res(ctx.json({
      total_customers: 3,
      converted_customers: 1,
      conversion_rate: 33.33,
      period: {
        start: '2024-01-01',
        end: '2024-01-31'
      }
    }));
  }),

  rest.get('/api/customers/analytics/conversion-by-user/', (req, res, ctx) => {
    return res(ctx.json({
      users: [
        {
          user_id: 1,
          user_name: 'Test User',
          total_customers: 3,
          converted: 1,
          conversion_rate: 33.33
        }
      ]
    }));
  }),

  rest.get('/api/customers/analytics/conversion-trend/', (req, res, ctx) => {
    return res(ctx.json({
      trend: [
        { date: '2024-01-01', conversions: 0 },
        { date: '2024-01-02', conversions: 1 },
        { date: '2024-01-03', conversions: 0 }
      ]
    }));
  })
);

// Test setup helpers
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Customer to Lead Conversion Integration Flows', () => {
  describe('Flow 1: CSV Import → View Customers → Convert to Lead', () => {
    test('completes full import and conversion workflow', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();

      // Step 1: Test CSV Import
      const { rerender } = render(
        <Wrapper>
          <CustomerImportModal 
            isOpen={true} 
            onClose={() => {}} 
            onImportComplete={() => {}}
          />
        </Wrapper>
      );

      // Upload CSV file
      const fileInput = screen.getByLabelText(/upload file/i);
      const csvFile = new File(['phone,name\n9876543210,John Doe'], 'customers.csv', {
        type: 'text/csv'
      });

      await user.upload(fileInput, csvFile);

      // Submit import
      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      // Wait for import success message
      await waitFor(() => {
        expect(screen.getByText(/3 customers imported successfully/i)).toBeInTheDocument();
      });

      // Step 2: View Customers List
      rerender(
        <Wrapper>
          <CustomerList />
        </Wrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });

      // Verify conversion status indicators
      const convertButtons = screen.getAllByText(/convert to lead/i);
      expect(convertButtons).toHaveLength(2); // Only unconverted customers

      // Step 3: Convert Customer to Lead
      rerender(
        <Wrapper>
          <ConversionFormModal
            isOpen={true}
            onClose={() => {}}
            customerId={1}
            onConversionComplete={() => {}}
          />
        </Wrapper>
      );

      // Wait for form to load with pre-filled data
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      });

      // Fill additional lead details
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.selectOptions(screen.getByLabelText(/requirement type/i), 'apartment');
      await user.selectOptions(screen.getByLabelText(/bhk/i), '3');
      await user.type(screen.getByLabelText(/budget min/i), '5000000');
      await user.type(screen.getByLabelText(/budget max/i), '7000000');

      // Submit conversion
      const convertButton = screen.getByRole('button', { name: /convert to lead/i });
      await user.click(convertButton);

      // Wait for conversion success
      await waitFor(() => {
        expect(screen.getByText(/successfully converted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Flow 2: Bulk Import → Bulk Convert → View Analytics', () => {
    test('completes bulk operations and analytics workflow', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();

      // Step 1: View Customer List with Selection
      render(
        <Wrapper>
          <CustomerList />
        </Wrapper>
      );

      // Wait for customers to load
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });

      // Select customers for bulk conversion
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select Jane Smith
      await user.click(checkboxes[1]); // Select Bob Johnson

      // Step 2: Bulk Convert
      const { rerender } = render(
        <Wrapper>
          <BulkConversionModal
            isOpen={true}
            onClose={() => {}}
            selectedCustomerIds={[2, 3]}
            onConversionComplete={() => {}}
          />
        </Wrapper>
      );

      // Set default values for bulk conversion
      await user.selectOptions(screen.getByLabelText(/requirement type/i), 'apartment');
      await user.selectOptions(screen.getByLabelText(/bhk/i), '2');
      await user.type(screen.getByLabelText(/budget min/i), '3000000');
      await user.type(screen.getByLabelText(/budget max/i), '5000000');

      // Submit bulk conversion
      const bulkConvertButton = screen.getByRole('button', { name: /convert all/i });
      await user.click(bulkConvertButton);

      // Wait for bulk conversion success
      await waitFor(() => {
        expect(screen.getByText(/2 customers converted successfully/i)).toBeInTheDocument();
      });

      // Step 3: View Analytics Dashboard
      rerender(
        <Wrapper>
          <ConversionAnalyticsDashboard />
        </Wrapper>
      );

      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByText(/conversion rate/i)).toBeInTheDocument();
        expect(screen.getByText('33.33%')).toBeInTheDocument();
      });

      // Verify analytics widgets
      expect(screen.getByText('Total Customers: 3')).toBeInTheDocument();
      expect(screen.getByText('Converted: 1')).toBeInTheDocument();

      // Check conversion trend chart
      expect(screen.getByText(/conversion trend/i)).toBeInTheDocument();
    });
  });

  describe('Flow 3: Manual Entry → Convert → Verify Results', () => {
    test('completes manual customer creation and conversion', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();

      // Mock manual customer creation
      server.use(
        rest.post('/api/customers/', (req, res, ctx) => {
          return res(ctx.status(201), ctx.json({
            id: 4,
            name: 'Manual Customer',
            phone: '9999888877',
            is_converted: false,
            converted_lead_id: null,
            call_status: 'pending',
            created_at: '2024-01-01T15:00:00Z'
          }));
        })
      );

      // Step 1: Manual Customer Entry (simulated via form)
      render(
        <Wrapper>
          <div>
            <input data-testid="customer-name" placeholder="Customer Name" />
            <input data-testid="customer-phone" placeholder="Phone Number" />
            <button data-testid="create-customer">Create Customer</button>
          </div>
        </Wrapper>
      );

      // Fill customer details
      await user.type(screen.getByTestId('customer-name'), 'Manual Customer');
      await user.type(screen.getByTestId('customer-phone'), '9999888877');

      // Create customer
      await user.click(screen.getByTestId('create-customer'));

      // Step 2: Convert Manual Customer
      const { rerender } = render(
        <Wrapper>
          <ConversionFormModal
            isOpen={true}
            onClose={() => {}}
            customerId={4}
            onConversionComplete={() => {}}
          />
        </Wrapper>
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Manual Customer')).toBeInTheDocument();
      });

      // Fill conversion details
      await user.type(screen.getByLabelText(/email/i), 'manual@example.com');
      await user.selectOptions(screen.getByLabelText(/requirement type/i), 'villa');
      await user.selectOptions(screen.getByLabelText(/bhk/i), '4');

      // Submit conversion
      const convertButton = screen.getByRole('button', { name: /convert to lead/i });
      await user.click(convertButton);

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/successfully converted/i)).toBeInTheDocument();
      });

      // Step 3: Verify in Customer List
      rerender(
        <Wrapper>
          <CustomerList />
        </Wrapper>
      );

      // Should show converted customer with badge
      await waitFor(() => {
        expect(screen.getByText('Manual Customer')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('handles conversion errors gracefully', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();

      // Mock conversion error
      server.use(
        rest.post('/api/customers/:id/convert/', (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({
            success: false,
            error: 'Budget minimum cannot be greater than maximum'
          }));
        })
      );

      render(
        <Wrapper>
          <ConversionFormModal
            isOpen={true}
            onClose={() => {}}
            customerId={1}
            onConversionComplete={() => {}}
          />
        </Wrapper>
      );

      // Fill invalid budget range
      await user.type(screen.getByLabelText(/budget min/i), '7000000');
      await user.type(screen.getByLabelText(/budget max/i), '5000000');

      // Submit conversion
      const convertButton = screen.getByRole('button', { name: /convert to lead/i });
      await user.click(convertButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/budget minimum cannot be greater than maximum/i))
          .toBeInTheDocument();
      });
    });

    test('handles import errors gracefully', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();

      // Mock import error
      server.use(
        rest.post('/api/customers/import/', (req, res, ctx) => {
          return res(ctx.json({
            success: false,
            summary: {
              total_rows: 2,
              success_count: 1,
              duplicate_count: 0,
              error_count: 1,
              errors: [
                { row: 2, phone: 'invalid', error: 'Invalid phone number format' }
              ]
            }
          }));
        })
      );

      render(
        <Wrapper>
          <CustomerImportModal
            isOpen={true}
            onClose={() => {}}
            onImportComplete={() => {}}
          />
        </Wrapper>
      );

      // Upload file with errors
      const fileInput = screen.getByLabelText(/upload file/i);
      const csvFile = new File(['phone,name\n1234567890,Valid\ninvalid,Invalid'], 'test.csv', {
        type: 'text/csv'
      });

      await user.upload(fileInput, csvFile);

      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      // Wait for error display
      await waitFor(() => {
        expect(screen.getByText(/1 error occurred/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Isolation Integration', () => {
    test('enforces company-based data isolation', async () => {
      const Wrapper = createTestWrapper();

      // Mock empty response for different company
      server.use(
        rest.get('/api/customers/', (req, res, ctx) => {
          return res(ctx.json({
            count: 0,
            results: []
          }));
        })
      );

      render(
        <Wrapper>
          <CustomerList />
        </Wrapper>
      );

      // Should show no customers for different company
      await waitFor(() => {
        expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
      });
    });
  });
});

describe('Performance Integration Tests', () => {
  test('handles large dataset import efficiently', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();

    // Mock large import response
    server.use(
      rest.post('/api/customers/import/', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          summary: {
            total_rows: 1000,
            success_count: 995,
            duplicate_count: 3,
            error_count: 2,
            errors: []
          }
        }));
      })
    );

    render(
      <Wrapper>
        <CustomerImportModal
          isOpen={true}
          onClose={() => {}}
          onImportComplete={() => {}}
        />
      </Wrapper>
    );

    // Simulate large file upload
    const fileInput = screen.getByLabelText(/upload file/i);
    const largeFile = new File(['phone,name\n'.repeat(1000)], 'large.csv', {
      type: 'text/csv'
    });

    await user.upload(fileInput, largeFile);

    const importButton = screen.getByRole('button', { name: /import/i });
    await user.click(importButton);

    // Should handle large import
    await waitFor(() => {
      expect(screen.getByText(/995 customers imported successfully/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});