import React from 'react';
import { Bell, BellOff, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/contexts/NotificationContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
    testNotification
  } = useNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Receive real-time notifications for important updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          Receive real-time notifications for important updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isEnabled
                ? 'You will receive push notifications for important events'
                : 'Enable notifications to stay updated with important events'}
            </p>
          </div>
          <Button
            onClick={isEnabled ? disableNotifications : enableNotifications}
            disabled={isLoading}
            variant={isEnabled ? 'outline' : 'default'}
          >
            {isLoading ? (
              'Processing...'
            ) : isEnabled ? (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Disable
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Enable
              </>
            )}
          </Button>
        </div>

        {isEnabled && (
          <div className="pt-4 border-t">
            <Button
              onClick={testNotification}
              variant="secondary"
              size="sm"
            >
              <TestTube className="mr-2 h-4 w-4" />
              Send Test Notification
            </Button>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">You'll receive notifications for:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Leave request approvals/rejections</li>
            <li>New announcements</li>
            <li>Task assignments and updates</li>
            <li>Project updates</li>
            <li>New leads and customer updates</li>
            <li>Important system alerts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
