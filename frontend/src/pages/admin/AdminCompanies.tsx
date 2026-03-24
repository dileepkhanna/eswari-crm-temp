import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextDjango';
import { apiClient } from '@/lib/api';
import { CompanyManagementForm } from '@/components/forms';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Edit, CheckCircle, XCircle, Power } from 'lucide-react';
import { toast } from 'sonner';
import type { Company } from '@/types';

import { logger } from '@/lib/logger';
export default function AdminCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const PROTECTED_COMPANIES = ['Eswari Group', 'ASE Technologies'];
  const isProtected = (company: Company) => PROTECTED_COMPANIES.includes(company.name);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    // Filter companies based on search query and status
    let filtered = companies;
    
    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(company => company.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(company => !company.is_active);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.code.toLowerCase().includes(query)
      );
    }
    
    setFilteredCompanies(filtered);
  }, [searchQuery, companies, statusFilter]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCompanies();
      const companiesData = Array.isArray(response) ? response : response.results || [];
      
      // Ensure is_active is a boolean (convert from string if needed)
      const normalizedCompanies = companiesData.map((company: any) => ({
        ...company,
        is_active: company.is_active === true || company.is_active === 'true' || company.is_active === 'True'
      }));
      
      logger.log('Loaded companies:', normalizedCompanies);
      setCompanies(normalizedCompanies);
      setFilteredCompanies(normalizedCompanies);
    } catch (error) {
      logger.error('Failed to load companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (formData: FormData) => {
    try {
      setIsSubmitting(true);
      await apiClient.createCompany(formData);
      toast.success('Company created successfully');
      setIsFormOpen(false);
      loadCompanies();
    } catch (error: any) {
      logger.error('Failed to create company:', error);
      if (error.message && error.message.includes('details:')) {
        try {
          const errorData = JSON.parse(error.message.split('details: ')[1]);
          const errorMessage = Object.values(errorData).flat().join(', ');
          toast.error(`Failed to create company: ${errorMessage}`);
        } catch {
          toast.error('Failed to create company');
        }
      } else {
        toast.error('Failed to create company');
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (formData: FormData) => {
    if (!editingCompany) return;

    try {
      setIsSubmitting(true);
      await apiClient.updateCompany(editingCompany.id, formData);
      toast.success('Company updated successfully');
      setIsFormOpen(false);
      setEditingCompany(null);
      loadCompanies();
    } catch (error: any) {
      logger.error('Failed to update company:', error);
      if (error.message && error.message.includes('details:')) {
        try {
          const errorData = JSON.parse(error.message.split('details: ')[1]);
          const errorMessage = Object.values(errorData).flat().join(', ');
          toast.error(`Failed to update company: ${errorMessage}`);
        } catch {
          toast.error('Failed to update company');
        }
      } else {
        toast.error('Failed to update company');
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (company: Company) => {
    const newStatus = !company.is_active;
    
    try {
      // Optimistic UI update
      const updatedCompanies = companies.map(c => 
        c.id === company.id ? { ...c, is_active: newStatus } : c
      );
      setCompanies(updatedCompanies);
      
      // Send only the is_active field for toggle
      const formData = new FormData();
      formData.append('is_active', newStatus.toString());
      
      logger.log(`Toggling company ${company.id} to ${newStatus}`);
      const response = await apiClient.updateCompany(company.id, formData);
      logger.log('Toggle response:', response);
      
      toast.success(`Company ${company.is_active ? 'deactivated' : 'activated'} successfully`);
      
      // Reload to ensure we have the latest data from server
      await loadCompanies();
    } catch (error) {
      logger.error('Failed to toggle company status:', error);
      toast.error('Failed to update company status');
      // Revert optimistic update on error
      await loadCompanies();
    }
  };

  const openEditForm = (company: Company) => {
    setEditingCompany(company);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingCompany(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
  };

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can manage companies.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Company Management" subtitle="Manage companies and their settings" />
      <div className="p-3 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Company Management
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage companies and their settings
            </p>
          </div>
          <Button onClick={openCreateForm} className="self-start sm:self-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>
              View and manage all companies in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className={statusFilter === 'active' ? '' : 'text-green-600 border-green-600 hover:bg-green-50'}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                  className={statusFilter === 'inactive' ? '' : 'text-gray-600 border-gray-600 hover:bg-gray-50'}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Inactive
                </Button>
              </div>
            </div>

            {/* Companies Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading companies...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No companies found matching your search' : 'No companies yet'}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={`${company.name} logo`}
                              className="h-10 w-10 object-contain rounded"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{company.name}</p>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded sm:hidden">
                              {company.code}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {company.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={company.is_active ? 'default' : 'secondary'}
                            className={isProtected(company) ? 'cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity'}
                            onClick={() => !isProtected(company) && handleToggleActive(company)}
                            title={isProtected(company) ? 'Protected company' : `Click to ${company.is_active ? 'deactivate' : 'activate'} company`}
                          >
                            {company.is_active ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(company.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isProtected(company) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleActive(company)}
                                  title={`${company.is_active ? 'Deactivate' : 'Activate'} company`}
                                  className={company.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditForm(company)}
                                  title="Edit company"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Form Modal */}
        <CompanyManagementForm
          open={isFormOpen}
          onClose={closeForm}
          onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}
          company={editingCompany}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
