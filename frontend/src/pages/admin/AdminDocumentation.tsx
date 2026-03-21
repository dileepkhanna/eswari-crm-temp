import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Tag, 
  Eye,
  Filter,
  BookOpen,
  Code,
  Bug,
  Settings,
  Users,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

import { logger } from '@/lib/logger';
interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  category: string;
  description: string;
  size: string;
  lastModified: string;
  tags: string[];
  content?: string;
}

const AdminDocumentation: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All Documents', icon: BookOpen },
    { id: 'features', name: 'Features', icon: Zap },
    { id: 'bugfixes', name: 'Bug Fixes', icon: Bug },
    { id: 'setup', name: 'Setup & Config', icon: Settings },
    { id: 'testing', name: 'Testing', icon: Code },
    { id: 'branding', name: 'Branding', icon: Users },
    { id: 'general', name: 'General', icon: FileText },
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/documentation/');
      setDocuments(response.documents || []);
      setFilteredDocs(response.documents || []);
    } catch (error) {
      logger.error('Failed to load documents:', error);
      toast.error('Failed to load documentation');
      // Fallback to mock data if API fails
      setDocuments([]);
      setFilteredDocs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = documents;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredDocs(filtered);
  }, [documents, selectedCategory, searchTerm]);

  const handleDownload = async (doc: DocumentItem) => {
    try {
      // Use the API to download the document
      const response = await fetch(`/api/documentation/download/${doc.path}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${doc.filename}`);
    } catch (error) {
      logger.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleViewDocument = async (doc: DocumentItem) => {
    try {
      const response = await apiClient.get(`/documentation/content/${doc.path}/`);
      setSelectedDoc({
        ...doc,
        content: response.content
      });
    } catch (error) {
      logger.error('Failed to load document content:', error);
      toast.error('Failed to load document content');
    }
  };

  const handleDownloadAll = async () => {
    try {
      // Create a zip-like structure (simplified as concatenated markdown)
      const allContent = await Promise.all(
        filteredDocs.map(async (doc) => {
          try {
            const response = await apiClient.get(`/documentation/content/${doc.path}/`);
            return `${'='.repeat(80)}\n# ${doc.filename}\n${'='.repeat(80)}\n\n${response.content}\n\n`;
          } catch (error) {
            return `${'='.repeat(80)}\n# ${doc.filename}\n${'='.repeat(80)}\n\n${doc.description}\n\n`;
          }
        })
      );

      const combinedContent = allContent.join('\n');
      const blob = new Blob([combinedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `eswari-crm-documentation-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded all ${filteredDocs.length} documents`);
    } catch (error) {
      logger.error('Failed to download all documents:', error);
      toast.error('Failed to download all documents');
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.icon : FileText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation Center</h1>
          <p className="text-muted-foreground">
            View, search, and download project documentation
          </p>
        </div>
        <Button onClick={handleDownloadAll} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download All ({filteredDocs.length})
        </Button>
      </div>

      <Tabs value={selectedDoc ? 'viewer' : 'list'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" onClick={() => setSelectedDoc(null)}>
            Document List
          </TabsTrigger>
          {selectedDoc && (
            <TabsTrigger value="viewer">
              Document Viewer
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const CategoryIcon = getCategoryIcon(doc.category);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CategoryIcon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      <Badge variant="secondary" className="text-xs">
                        {doc.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {doc.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>{doc.size}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {doc.lastModified}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDocument(doc)}
                        className="flex-1 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="flex-1 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDocs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="viewer" className="space-y-4">
          {selectedDoc && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {selectedDoc.title}
                    </CardTitle>
                    <CardDescription>
                      {selectedDoc.filename} • {selectedDoc.size} • {selectedDoc.lastModified}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedDoc)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDoc(null)}
                    >
                      Back to List
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                    {selectedDoc.content || `# ${selectedDoc.title}\n\n${selectedDoc.description}\n\nThis document contains detailed information about ${selectedDoc.title.toLowerCase()}.`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDocumentation;