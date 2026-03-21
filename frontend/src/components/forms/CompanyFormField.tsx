import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
interface CompanyFormFieldProps {
  control: any;
  name?: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CompanyFormField({
  control,
  name = 'company',
  label = 'Company',
  description,
  required = true,
  disabled = false,
}: CompanyFormFieldProps) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine if user can select company (admin/hr)
  const canSelect = user?.role === 'admin' || user?.role === 'hr';

  useEffect(() => {
    const loadCompanies = async () => {
      logger.log('[CompanyFormField] === STARTING LOAD ===');
      logger.log('[CompanyFormField] canSelect:', canSelect);
      logger.log('[CompanyFormField] user role:', user?.role);
      
      if (!canSelect) {
        logger.log('[CompanyFormField] User cannot select, exiting');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        logger.log('[CompanyFormField] Token exists:', !!token);
        
        if (!token) {
          logger.error('[CompanyFormField] No access token found');
          setLoading(false);
          return;
        }
        
        logger.log('[CompanyFormField] Fetching from: /api/auth/companies/');
        const response = await fetch('/api/auth/companies/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        logger.log('[CompanyFormField] Response status:', response.status);
        logger.log('[CompanyFormField] Response ok:', response.ok);
        
        if (response.ok) {
          const text = await response.text();
          logger.log('[CompanyFormField] Raw response text (first 500 chars):', text.substring(0, 500));
          
          let data;
          try {
            data = JSON.parse(text);
            logger.log('[CompanyFormField] Parsed JSON successfully');
          } catch (parseError) {
            logger.error('[CompanyFormField] Failed to parse JSON');
            logger.error('[CompanyFormField] Response is HTML, not JSON');
            logger.error('[CompanyFormField] This means the API endpoint is not found or returning wrong content');
            setLoading(false);
            return;
          }
          
          logger.log('[CompanyFormField] Raw response data:', JSON.stringify(data, null, 2));
          
          // Handle both paginated and non-paginated responses
          let companiesList: any[] = [];
          if (Array.isArray(data)) {
            logger.log('[CompanyFormField] Data is array, length:', data.length);
            companiesList = data;
          } else if (data.results && Array.isArray(data.results)) {
            logger.log('[CompanyFormField] Data is paginated, results length:', data.results.length);
            companiesList = data.results;
          } else {
            logger.error('[CompanyFormField] Unexpected data format:', typeof data);
          }
          
          logger.log('[CompanyFormField] Companies list:', companiesList);
          
          // Filter only active companies
          const activeCompanies = companiesList.filter((c: any) => {
            const isActive = c.is_active === true;
            logger.log(`[CompanyFormField] ${c.name}: is_active=${c.is_active} (type: ${typeof c.is_active}), keeping: ${isActive}`);
            return isActive;
          });
          
          logger.log('[CompanyFormField] Active companies count:', activeCompanies.length);
          logger.log('[CompanyFormField] Active companies:', activeCompanies);
          logger.log('[CompanyFormField] Setting companies state...');
          setCompanies(activeCompanies);
          logger.log('[CompanyFormField] State set complete');
        } else {
          logger.error('[CompanyFormField] Failed to fetch, status:', response.status);
          const text = await response.text();
          logger.error('[CompanyFormField] Error response:', text);
        }
      } catch (error) {
        logger.error('[CompanyFormField] Exception caught:', error);
        logger.error('[CompanyFormField] Error details:', JSON.stringify(error, null, 2));
      } finally {
        logger.log('[CompanyFormField] Setting loading to false');
        setLoading(false);
        logger.log('[CompanyFormField] === LOAD COMPLETE ===');
      }
    };

    loadCompanies();
  }, [canSelect]);

  // For manager/employee users, return hidden field with their company
  if (!canSelect && user?.company) {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className="hidden">
            <FormControl>
              <input type="hidden" {...field} value={field.value || user.company.id} />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  // For admin/hr users, show company selector
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        logger.log('[CompanyFormField] Current field value:', field.value, 'Type:', typeof field.value);
        
        return (
          <FormItem>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <Select
              onValueChange={(value) => {
                logger.log('[CompanyFormField] Company selected:', value);
                const numValue = Number(value);
                logger.log('[CompanyFormField] Setting field value to:', numValue);
                field.onChange(numValue);
              }}
              value={field.value && field.value > 0 ? field.value.toString() : undefined}
              disabled={disabled || loading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading companies..." : "Select a company"}>
                  {field.value && companies.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {companies.find(c => c.id === field.value)?.name || 'Select a company'}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {loading ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Loading companies...
                </div>
              ) : companies.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No active companies available
                  <div className="text-xs mt-1">
                    (Loaded {companies.length} companies)
                  </div>
                </div>
              ) : (
                <>
                  {logger.log('[CompanyFormField] Rendering', companies.length, 'companies in dropdown')}
                  {/* Add "No Company" option for admin/HR if not required */}
                  {!required && (
                    <SelectItem value="0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>No Company (Global Access)</span>
                      </div>
                    </SelectItem>
                  )}
                  {companies.map((company) => {
                    logger.log('[CompanyFormField] Rendering company:', company.id, company.name);
                    return (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{company.name}</span>
                          <span className="text-xs text-muted-foreground">({company.code})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </>
              )}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
        );
      }}
    />
  );
}
