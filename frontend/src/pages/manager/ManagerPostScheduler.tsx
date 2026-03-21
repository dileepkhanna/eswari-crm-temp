import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const ManagerPostScheduler = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Post Scheduler</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Scheduled Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Facebook className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">New product launch announcement</p>
                      <p className="text-sm text-gray-500">March 15, 2026 at 10:00 AM</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Edit</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Instagram className="h-5 w-5 text-pink-600" />
                    <div>
                      <p className="font-medium">Behind the scenes content</p>
                      <p className="text-sm text-gray-500">March 16, 2026 at 2:00 PM</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Edit</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Linkedin className="h-5 w-5 text-blue-700" />
                    <div>
                      <p className="font-medium">Industry insights article</p>
                      <p className="text-sm text-gray-500">March 17, 2026 at 9:00 AM</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Edit</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Posts This Week</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Published</p>
                  <p className="text-2xl font-bold">4</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerPostScheduler;