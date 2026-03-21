import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, Plus, Edit, Trash2, Calendar, Gift, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { birthdayService, Birthday } from '@/services/birthday.service';
import BirthdayFormModal from '@/components/birthdays/BirthdayFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { logger } from '@/lib/logger';
export default function HRBirthdays() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [creatingAnnouncements, setCreatingAnnouncements] = useState(false);

  // Fetch birthdays
  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await birthdayService.getBirthdays();
      setBirthdays(data);
    } catch (error: any) {
      logger.error('Error fetching birthdays:', error);
      setError('Failed to load birthdays. Please try again.');
      toast.error('Failed to fetch birthdays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdays();
  }, []);

  // Filter birthdays
  const filteredBirthdays = birthdays.filter(birthday => {
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = (
      birthday.employee_name.toLowerCase().includes(query) ||
      birthday.employee_email.toLowerCase().includes(query)
    );
    
    const matchesRole = roleFilter === 'all' || birthday.employee_role === roleFilter;
    const matchesCompany = companyFilter === 'all' || birthday.employee_company === companyFilter;
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  // Get unique companies and roles for filters
  const companies = Array.from(new Set(birthdays.map(b => b.employee_company))).filter(Boolean);
  const roles = Array.from(new Set(birthdays.map(b => b.employee_role))).filter(Boolean);

  const handleCreateClick = () => {
    setEditingBirthday(null);
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (birthday: Birthday) => {
    setEditingBirthday(birthday);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (birthday: Birthday) => {
    setDeleteId(birthday.id);
  };

  const handleSaveBirthday = async (birthdayData: Partial<Birthday>) => {
    try {
      if (editingBirthday) {
        await birthdayService.updateBirthday(editingBirthday.id, birthdayData);
        toast.success('Birthday updated successfully!');
      } else {
        await birthdayService.createBirthday(birthdayData);
        toast.success('Birthday added successfully!');
      }
      setIsCreateModalOpen(false);
      setEditingBirthday(null);
      await fetchBirthdays();
    } catch (error: any) {
      logger.error('Error saving birthday:', error);
      toast.error(error.message || 'Failed to save birthday');
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await birthdayService.deleteBirthday(deleteId);
        toast.success('Birthday deleted successfully!');
        setDeleteId(null);
        await fetchBirthdays();
      } catch (error: any) {
        logger.error('Error deleting birthday:', error);
        toast.error(error.message || 'Failed to delete birthday');
      }
    }
  };

  const handleCreateAnnouncements = async () => {
    try {
      setCreatingAnnouncements(true);
      const result = await birthdayService.createBirthdayAnnouncements();
      toast.success(result.message);
    } catch (error: any) {
      logger.error('Error creating birthday announcements:', error);
      toast.error(error.message || 'Failed to create birthday announcements');
    } finally {
      setCreatingAnnouncements(false);
    }
  };

  const getBirthdayBadgeColor = (daysUntil: number) => {
    if (daysUntil === 0) return 'bg-green-100 text-green-700 border-green-300';
    if (daysUntil <= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (daysUntil <= 30) return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Birthday Calendar" subtitle="Manage employee birthdays and announcements" />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading birthdays...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <TopBar title="Birthday Calendar" subtitle="Manage employee birthdays and announcements" />
        <div className="p-6">
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchBirthdays} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Birthday Calendar" subtitle="Manage employee birthdays and announcements">
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateAnnouncements}
            disabled={creatingAnnouncements}
            variant="outline"
            className="btn-secondary"
          >
            {creatingAnnouncements ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Create Today's Announcements
              </>
            )}
          </Button>
          <Button onClick={handleCreateClick} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Birthday
          </Button>
        </div>
      </TopBar>
      
      <div className="p-6">
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Birthdays</p>
                  <p className="text-2xl font-bold">
                    {birthdays.filter(b => b.is_birthday_today).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">
                    {birthdays.filter(b => b.days_until_birthday <= 7).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {birthdays.filter(b => b.days_until_birthday <= 30).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Birthdays</p>
                  <p className="text-2xl font-bold">{birthdays.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                {filteredBirthdays.length} of {birthdays.length} birthdays
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Birthday Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Birth Date</TableHead>
                  <TableHead className="font-semibold">Age</TableHead>
                  <TableHead className="font-semibold">Next Birthday</TableHead>
                  <TableHead className="font-semibold">Days Until</TableHead>
                  <TableHead className="font-semibold">Announce</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBirthdays.map((birthday, index) => (
                  <TableRow 
                    key={birthday.id} 
                    className="table-row-hover animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {birthday.employee_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {birthday.employee_role} • {birthday.employee_company}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(birthday.birth_date), 'MMM dd, yyyy')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {birthday.show_age && birthday.age ? `${birthday.age} years` : 'Hidden'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(birthday.next_birthday), 'MMM dd, yyyy')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(getBirthdayBadgeColor(birthday.days_until_birthday))}
                      >
                        {birthday.is_birthday_today 
                          ? 'Today!' 
                          : `${birthday.days_until_birthday} days`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={birthday.announce_birthday 
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                        }
                      >
                        {birthday.announce_birthday ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(birthday)}
                          className="h-8 w-8 p-0"
                          title="Edit birthday"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(birthday)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete birthday"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredBirthdays.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || roleFilter !== 'all' || companyFilter !== 'all'
                    ? 'No birthdays found matching your filters' 
                    : 'No birthdays added yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Birthday Form Modal */}
      <BirthdayFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleSaveBirthday}
        birthday={editingBirthday || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Birthday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this birthday record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}