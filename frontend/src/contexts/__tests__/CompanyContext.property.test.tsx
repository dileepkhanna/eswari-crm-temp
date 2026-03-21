/**
 * Property-Based Test: Company Context Persistence
 * 
 * **Feature: multi-company-support, Property 10: Company Context Persistence**
 * 
 * **Validates: Requirements 6.3, 6.5**
 * 
 * For any valid company object stored in the CompanyContext, retrieving the company
 * from localStorage should yield an equivalent value to what was originally stored,
 * maintaining company selection state across sessions.
 * 
 * Requirement 6.3: When a Cross_Company_Role user selects a company, the Frontend_App 
 * SHALL store the selection in application state
 * 
 * Requirement 6.5: The Frontend_App SHALL persist the selected company in browser 
 * storage across sessions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { CompanyProvider, useCompany } from '../CompanyContext';
import type { Company } from '@/types';

describe('Property 10: Company Context Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Property Test: Company round trip
   * 
   * Tests that any valid company object stored can be retrieved with the same value.
   * This ensures data integrity for company selection state.
   */
  it('**Validates: Requirements 6.3, 6.5** - Company round trip preserves all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (company: Company) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store the company
          act(() => {
            result.current.setSelectedCompany(company);
          });

          // Retrieve from localStorage
          const stored = localStorage.getItem('selectedCompany');
          expect(stored).not.toBeNull();
          
          const retrieved = JSON.parse(stored!);

          // Property: Retrieved company should equal stored company
          expect(retrieved).toEqual(company);
          expect(retrieved.id).toBe(company.id);
          expect(retrieved.name).toBe(company.name);
          expect(retrieved.code).toBe(company.code);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company persistence across context instances
   * 
   * Tests that a company stored in one context instance can be retrieved
   * by a new context instance, simulating page reload.
   */
  it('**Validates: Requirements 6.3, 6.5** - Company persists across context instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (company: Company) => {
          // First context instance - store company
          const { result: result1 } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          act(() => {
            result1.current.setSelectedCompany(company);
          });

          // Second context instance - should load from localStorage
          const { result: result2 } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Property: Second instance should have the same company
          expect(result2.current.selectedCompany).toEqual(company);
          expect(result2.current.selectedCompany?.id).toBe(company.id);
          expect(result2.current.selectedCompany?.name).toBe(company.name);
          expect(result2.current.selectedCompany?.code).toBe(company.code);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company with special characters
   * 
   * Tests that companies with special characters in name or code
   * are stored and retrieved correctly.
   */
  it('**Validates: Requirements 6.3, 6.5** - Special characters in company fields are preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.array(
            fc.constantFrom(
              'A', 'B', 'C', '0', '1', '2',
              '-', '_', '.', '&', '@', '#'
            ),
            { minLength: 1, maxLength: 20 }
          ).map(chars => chars.join('')),
        }),
        async (company: Company) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store company with special characters
          act(() => {
            result.current.setSelectedCompany(company);
          });

          // Retrieve from localStorage
          const stored = localStorage.getItem('selectedCompany');
          const retrieved = JSON.parse(stored!);

          // Property: All characters should be preserved exactly
          expect(retrieved.name).toBe(company.name);
          expect(retrieved.code).toBe(company.code);
          expect(retrieved.name.length).toBe(company.name.length);
          expect(retrieved.code.length).toBe(company.code.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company overwrite behavior
   * 
   * Tests that storing a new company overwrites the old one completely,
   * ensuring no data corruption or mixing.
   */
  it('**Validates: Requirements 6.3, 6.5** - Company overwrite replaces old value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          firstCompany: fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          secondCompany: fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
          }),
        }),
        async ({ firstCompany, secondCompany }) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store first company
          act(() => {
            result.current.setSelectedCompany(firstCompany);
          });

          // Verify first company is stored
          expect(result.current.selectedCompany).toEqual(firstCompany);

          // Store second company (overwrite)
          act(() => {
            result.current.setSelectedCompany(secondCompany);
          });

          // Retrieve from localStorage
          const stored = localStorage.getItem('selectedCompany');
          const retrieved = JSON.parse(stored!);

          // Property: Only the second company should be present
          expect(retrieved).toEqual(secondCompany);
          expect(result.current.selectedCompany).toEqual(secondCompany);
          
          // Property: No mixing or corruption of values
          if (firstCompany.id !== secondCompany.id) {
            expect(retrieved.id).not.toBe(firstCompany.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company removal completeness
   * 
   * Tests that clearing the company context removes it completely from storage,
   * ensuring proper logout state.
   */
  it('**Validates: Requirements 6.3, 6.5** - Company removal is complete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (company: Company) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store company
          act(() => {
            result.current.setSelectedCompany(company);
          });

          // Verify company is stored
          expect(result.current.selectedCompany).toEqual(company);
          expect(localStorage.getItem('selectedCompany')).not.toBeNull();

          // Clear company context
          act(() => {
            result.current.clearCompanyContext();
          });

          // Property: Company should be null after clearing
          expect(result.current.selectedCompany).toBeNull();
          expect(localStorage.getItem('selectedCompany')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: JSON serialization integrity
   * 
   * Tests that the company object maintains its structure through
   * JSON serialization and deserialization.
   */
  it('**Validates: Requirements 6.3, 6.5** - JSON serialization preserves structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async (company: Company) => {
          // Manually serialize and deserialize
          const serialized = JSON.stringify(company);
          const deserialized = JSON.parse(serialized);

          // Property: Deserialized object should equal original
          expect(deserialized).toEqual(company);
          expect(typeof deserialized.id).toBe('number');
          expect(typeof deserialized.name).toBe('string');
          expect(typeof deserialized.code).toBe('string');

          // Store in localStorage
          localStorage.setItem('selectedCompany', serialized);
          const retrieved = JSON.parse(localStorage.getItem('selectedCompany')!);

          // Property: Retrieved object should match original
          expect(retrieved).toEqual(company);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Sequential company operations
   * 
   * Tests that multiple company selection operations in sequence
   * maintain data integrity.
   */
  it('**Validates: Requirements 6.3, 6.5** - Sequential operations maintain integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (companies: Company[]) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Perform multiple store operations
          for (const company of companies) {
            act(() => {
              result.current.setSelectedCompany(company);
            });

            // Property: Each operation should maintain integrity
            expect(result.current.selectedCompany).toEqual(company);
            
            const stored = localStorage.getItem('selectedCompany');
            const retrieved = JSON.parse(stored!);
            expect(retrieved).toEqual(company);
          }

          // Property: Final state should match last operation
          const lastCompany = companies[companies.length - 1];
          expect(result.current.selectedCompany).toEqual(lastCompany);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company ID uniqueness preservation
   * 
   * Tests that company IDs (which should be unique) are preserved
   * correctly through storage and retrieval.
   */
  it('**Validates: Requirements 6.3, 6.5** - Company ID uniqueness is preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 10 }
        ).map(companies => {
          // Ensure unique IDs
          return companies.map((company, index) => ({
            ...company,
            id: index + 1,
          }));
        }),
        async (companies: Company[]) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store each company and verify ID is preserved
          for (const company of companies) {
            act(() => {
              result.current.setSelectedCompany(company);
            });

            const stored = localStorage.getItem('selectedCompany');
            const retrieved = JSON.parse(stored!);

            // Property: ID should be preserved as a number
            expect(retrieved.id).toBe(company.id);
            expect(typeof retrieved.id).toBe('number');
            expect(Number.isInteger(retrieved.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Long company names and codes
   * 
   * Tests that companies with long names or codes are stored
   * and retrieved correctly without truncation.
   */
  it('**Validates: Requirements 6.3, 6.5** - Long company names are handled correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1, max: 1000000 }),
          name: fc.string({ minLength: 50, maxLength: 100 }),
          code: fc.string({ minLength: 10, maxLength: 20 }),
        }),
        async (company: Company) => {
          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Store company with long name
          act(() => {
            result.current.setSelectedCompany(company);
          });

          // Retrieve from localStorage
          const stored = localStorage.getItem('selectedCompany');
          const retrieved = JSON.parse(stored!);

          // Property: Long name should be preserved completely
          expect(retrieved.name).toBe(company.name);
          expect(retrieved.name.length).toBe(company.name.length);
          expect(retrieved.code).toBe(company.code);
          expect(retrieved.code.length).toBe(company.code.length);

          // Property: No truncation should occur
          expect(retrieved.name.substring(0, 20)).toBe(company.name.substring(0, 20));
          expect(retrieved.name.substring(company.name.length - 20)).toBe(
            company.name.substring(company.name.length - 20)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Company persistence with initializeCompanyContext
   * 
   * Tests that persisted company selection is restored when initializing
   * the context for admin/hr users with multiple companies.
   */
  it('**Validates: Requirements 6.3, 6.5** - Persisted company is restored on initialization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          persistedCompany: fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            code: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          availableCompanies: fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              code: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
        }).chain(({ persistedCompany, availableCompanies }) => {
          // Ensure persisted company is in available companies
          const companies = [persistedCompany, ...availableCompanies];
          return fc.constant({ persistedCompany, companies });
        }),
        async ({ persistedCompany, companies }) => {
          // Pre-populate localStorage with persisted company
          localStorage.setItem('selectedCompany', JSON.stringify(persistedCompany));

          const { result } = renderHook(() => useCompany(), {
            wrapper: CompanyProvider,
          });

          // Initialize context as admin with multiple companies
          act(() => {
            result.current.initializeCompanyContext('admin', undefined, companies);
          });

          // Property: Persisted company should be restored
          expect(result.current.selectedCompany).toEqual(persistedCompany);
          expect(result.current.selectedCompany?.id).toBe(persistedCompany.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
