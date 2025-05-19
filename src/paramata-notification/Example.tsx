'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { SocketNotificationDropdown } from './client';

export default function ExampleNotificationIntegration() {
  const { data: session } = useSession();
  const [browserNotifications, setBrowserNotifications] = useState(true);
  
  if (!session?.user?.id) {
    return <div>Please log in to see notifications.</div>;
  }
  
  return (
    <div>
      <div className="flex items-center justify-between p-4 bg-white shadow mb-6">
        <h1 className="text-xl font-bold">Paramata</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="browser-notifications"
              checked={browserNotifications}
              onChange={(e) => setBrowserNotifications(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="browser-notifications" className="text-sm">
              Enable browser notifications
            </label>
          </div>
          
          {/* Use the SocketNotificationDropdown component */}
          <SocketNotificationDropdown 
            userId={session.user.id} 
            role={session.user.role} 
            enableBrowserNotifications={browserNotifications}
          />
          
          <div className="ml-4">
            <span className="font-medium">{session.user.name}</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">How to Use the Notification System</h2>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">1. Replace existing notification component</h3>
          <code className="bg-gray-200 p-2 block text-sm">
            {`// Before
import NotificationDropdown from '@/components/notifications/NotificationDropdown';

// After
import { SocketNotificationDropdown } from '@/paramata-notification/client';`}
          </code>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md mt-4">
          <h3 className="font-medium mb-2">2. Add the component to your layout</h3>
          <code className="bg-gray-200 p-2 block text-sm">
            {`<SocketNotificationDropdown 
  userId={session.user.id} 
  role={session.user.role} 
  enableBrowserNotifications={true}
/>`}
          </code>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md mt-4">
          <h3 className="font-medium mb-2">3. Start the notification server</h3>
          <code className="bg-gray-200 p-2 block text-sm">
            {`# In a separate terminal window
npm run notifications`}
          </code>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md mt-4">
          <h3 className="font-medium mb-2">4. Create notifications using the API</h3>
          <code className="bg-gray-200 p-2 block text-sm">
            {`// In your API route or server code
import { notificationService } from '@/paramata-notification/server';

// Create a notification for a specific user
await notificationService.createNotification({
  userId: 'user-id',
  title: 'New Request',
  message: 'Someone has requested to rent an item',
  type: 'RENTAL_REQUEST',
});`}
          </code>
        </div>
      </div>
    </div>
  );
} 