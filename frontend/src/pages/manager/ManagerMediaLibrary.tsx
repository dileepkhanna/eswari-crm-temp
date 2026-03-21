import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image, Video, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const ManagerMediaLibrary = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Search media files..." className="pl-10" />
        </div>
        <Button variant="outline">Filter</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium truncate">sample-image.jpg</p>
            <p className="text-xs text-gray-500">2.3 MB</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium truncate">promo-video.mp4</p>
            <p className="text-xs text-gray-500">15.7 MB</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium truncate">brochure.pdf</p>
            <p className="text-xs text-gray-500">1.2 MB</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium truncate">logo-design.png</p>
            <p className="text-xs text-gray-500">856 KB</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerMediaLibrary;