import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CompanyProvider, useCompany } from '../CompanyContext';
import type { Company } from '@/types';

describe('CompanyContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with null selectedCompany', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    expect(result.current.selectedCompany).toBeNull();
    expect(result.current.availableCompanies).toEqual([]);
    expect(result.current.canSelectCompany).toBe(false);
  });

  it('should set and persist selected company to localStorage', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const testCompany: Company = {
      id: 1,
      name: 'Test Company',
      code: 'TEST',
    };

    act(() => {
      result.current.setSelectedCompany(testCompany);
    });

    expect(result.current.selectedCompany).toEqual(testCompany);
    expect(localStorage.getItem('selectedCompany')).toBe(JSON.stringify(testCompany));
  });

  it('should load persisted company from localStorage on initialization', () => {
    const testCompany: Company = {
      id: 1,
      name: 'Test Company',
      code: 'TEST',
    };

    localStorage.setItem('selectedCompany', JSON.stringify(testCompany));

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    expect(result.current.selectedCompany).toEqual(testCompany);
  });

  it('should initialize company context for admin with multiple companies', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const companies: Company[] = [
      { id: 1, name: 'Company A', code: 'COMPA' },
      { id: 2, name: 'Company B', code: 'COMPB' },
    ];

    act(() => {
      result.current.initializeCompanyContext('admin', undefined, companies);
    });

    expect(result.current.canSelectCompany).toBe(true);
    expect(result.current.availableCompanies).toEqual(companies);
    expect(result.current.selectedCompany).toEqual(companies[0]);
  });

  it('should initialize company context for hr with multiple companies', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const companies: Company[] = [
      { id: 1, name: 'Company A', code: 'COMPA' },
      { id: 2, name: 'Company B', code: 'COMPB' },
    ];

    act(() => {
      result.current.initializeCompanyContext('hr', undefined, companies);
    });

    expect(result.current.canSelectCompany).toBe(true);
    expect(result.current.availableCompanies).toEqual(companies);
    expect(result.current.selectedCompany).toEqual(companies[0]);
  });

  it('should initialize company context for manager with single company', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const userCompany: Company = {
      id: 1,
      name: 'Manager Company',
      code: 'MGRC',
    };

    act(() => {
      result.current.initializeCompanyContext('manager', userCompany);
    });

    expect(result.current.canSelectCompany).toBe(false);
    expect(result.current.availableCompanies).toEqual([userCompany]);
    expect(result.current.selectedCompany).toEqual(userCompany);
  });

  it('should initialize company context for employee with single company', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const userCompany: Company = {
      id: 1,
      name: 'Employee Company',
      code: 'EMPC',
    };

    act(() => {
      result.current.initializeCompanyContext('employee', userCompany);
    });

    expect(result.current.canSelectCompany).toBe(false);
    expect(result.current.availableCompanies).toEqual([userCompany]);
    expect(result.current.selectedCompany).toEqual(userCompany);
  });

  it('should restore persisted company selection for admin if still valid', () => {
    const companies: Company[] = [
      { id: 1, name: 'Company A', code: 'COMPA' },
      { id: 2, name: 'Company B', code: 'COMPB' },
    ];

    // Persist company B
    localStorage.setItem('selectedCompany', JSON.stringify(companies[1]));

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    act(() => {
      result.current.initializeCompanyContext('admin', undefined, companies);
    });

    // Should restore company B, not default to company A
    expect(result.current.selectedCompany).toEqual(companies[1]);
  });

  it('should clear company context on logout', () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    const testCompany: Company = {
      id: 1,
      name: 'Test Company',
      code: 'TEST',
    };

    act(() => {
      result.current.setSelectedCompany(testCompany);
      result.current.initializeCompanyContext('admin', undefined, [testCompany]);
    });

    expect(result.current.selectedCompany).toEqual(testCompany);

    act(() => {
      result.current.clearCompanyContext();
    });

    expect(result.current.selectedCompany).toBeNull();
    expect(result.current.availableCompanies).toEqual([]);
    expect(result.current.canSelectCompany).toBe(false);
    expect(localStorage.getItem('selectedCompany')).toBeNull();
  });

  it('should throw error when useCompany is used outside CompanyProvider', () => {
    expect(() => {
      renderHook(() => useCompany());
    }).toThrow('useCompany must be used within CompanyProvider');
  });
});
