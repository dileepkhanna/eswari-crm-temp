import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Settings, BarChart3 } from 'lucide-react';

const ManagerWebsites = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Website Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Website
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Main Website
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Primary company website</p>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Landing Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Campaign landing pages</p>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Blog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Company blog and articles</p>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerWebsites;