# Real-Time Updates with WebSocket

This document describes the real-time update system in the Eswari CRM frontend, which uses WebSocket connections to receive instant notifications about data changes.

## Overview

The real-time update system consists of two main components:

1. **WebSocket Service** (`src/services/websocket.service.ts`) - Low-level WebSocket connection management
2. **useRealtimeUpdates Hook** (`src/hooks/useRealtimeUpdates.ts`) - React hook for easy component integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  LeadsList   │  │ CustomersList│  │  TasksList   │      │
│  │  Component   │  │  Component   │  │  Component   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                           ▼                                  │
│              ┌─────────────────────────┐                     │
│              │ useRealtimeUpdates Hook │                     │
│              │  (Subscribe to events)  │                     │
│              └────────────┬────────────┘                     │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  WebSocket Service                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Connection management                           │     │
│  │  • Event subscription/unsubscription              │     │
│  │  • Auto-reconnection                              │     │
│  │  • Ping/pong keepalive                            │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                Django Channels Backend                       │
│                 (WebSocket Endpoint)                         │
└─────────────────────────────────────────────────────────────┘
```

## WebSocket Service

### Connection

The WebSocket service automatically connects when the user logs in and manages the connection lifecycle:

```typescript
import { websocketService } from '@/services/websocket.service';

// Connect with JWT token
websocketService.connect(accessToken);

// Disconnect on logout
websocketService.disconnect();

// Check connection status
const isConnected = websocketService.isConnected();
```

### Event Types

The system supports the following event types:

| Event Type | Description | Example Data |
|------------|-------------|--------------|
| `connection_established` | Initial connection confirmation | `{ user_id: 123 }` |
| `lead_created` | New lead created | `{ lead_id: 456, created_by: 'John' }` |
| `lead_deleted` | Lead deleted | `{ lead_id: 456 }` |
| `customer_created` | New customer created | `{ customer_id: 789 }` |
| `customer_updated` | Customer updated | `{ customer_id: 789 }` |
| `task_created` | New task created | `{ task_id: 101 }` |
| `task_updated` | Task updated | `{ task_id: 101, status: 'completed' }` |
| `task_deleted` | Task deleted | `{ task_id: 101 }` |
| `ase_data_changed` | ASE entity changed | `{ entity: 'calls', action: 'updated' }` |
| `notification` | General notification | `{ title: 'New message', body: '...' }` |
| `announcement` | System announcement | `{ title: 'Maintenance', message: '...' }` |
| `status_update` | Entity status changed | `{ entity: 'lead', id: 123, status: 'closed' }` |

### Manual Subscription (Advanced)

For low-level control, you can subscribe to events directly:

```typescript
// Subscribe to specific event
const unsubscribe = websocketService.on('lead_created', (message) => {
  console.log('New lead created:', message.data);
  // Refresh data, show toast, etc.
});

// Subscribe to all events
const unsubscribeAll = websocketService.on('all', (message) => {
  console.log('Event received:', message.type, message.data);
});

// Unsubscribe when done
unsubscribe();
unsubscribeAll();
```

## useRealtimeUpdates Hook

### Overview

The `useRealtimeUpdates` hook provides a declarative way to subscribe to WebSocket events in React components. It automatically handles subscription lifecycle (subscribe on mount, unsubscribe on unmount).

### Basic Usage

```typescript
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

function LeadsList() {
  const { fetchLeads } = useLeadsData();

  // Refresh leads when real-time events occur
  useRealtimeUpdates({
    events: ['lead_created', 'lead_deleted'],
    onUpdate: () => {
      console.log('Lead data changed, refreshing...');
      fetchLeads();
    }
  });

  return (
    // ... component JSX
  );
}
```

### API Reference

```typescript
interface UseRealtimeUpdatesOptions {
  /**
   * Array of event types to listen for
   */
  events: WebSocketEventType[];
  
  /**
   * Callback function to execute when any of the specified events occur
   */
  onUpdate: () => void;
  
  /**
   * Whether to enable real-time updates (default: true)
   */
  enabled?: boolean;
}

function useRealtimeUpdates(options: UseRealtimeUpdatesOptions): void
```

### Parameters

- **events**: Array of event types to subscribe to (see Event Types table above)
- **onUpdate**: Callback function invoked when any subscribed event occurs
- **enabled**: Optional boolean to conditionally enable/disable updates (default: `true`)

### Examples

#### Example 1: Refresh Data on Multiple Events

```typescript
function CustomersList() {
  const { refetch } = useCustomers();

  useRealtimeUpdates({
    events: ['customer_created', 'customer_updated'],
    onUpdate: refetch
  });

  return (/* ... */);
}
```

#### Example 2: Conditional Updates

```typescript
function TasksList() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { fetchTasks } = useTasksData();

  useRealtimeUpdates({
    events: ['task_created', 'task_updated', 'task_deleted'],
    onUpdate: fetchTasks,
    enabled: autoRefresh // Only update when auto-refresh is enabled
  });

  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={autoRefresh}
          onChange={e => setAutoRefresh(e.target.checked)}
        />
        Auto-refresh
      </label>
      {/* ... */}
    </div>
  );
}
```

#### Example 3: Multiple Event Handlers

```typescript
function Dashboard() {
  const { refreshLeads } = useLeadsData();
  const { refreshCustomers } = useCustomersData();
  const { showNotification } = useNotifications();

  // Refresh leads
  useRealtimeUpdates({
    events: ['lead_created', 'lead_deleted'],
    onUpdate: refreshLeads
  });

  // Refresh customers
  useRealtimeUpdates({
    events: ['customer_created', 'customer_updated'],
    onUpdate: refreshCustomers
  });

  // Show notification toasts
  useRealtimeUpdates({
    events: ['notification', 'announcement'],
    onUpdate: showNotification
  });

  return (/* ... */);
}
```

#### Example 4: Optimistic Updates with Real-Time Sync

```typescript
function TasksList() {
  const [tasks, setTasks] = useState([]);
  const { fetchTasks } = useTasksAPI();

  // Optimistically update UI immediately
  const handleTaskCreate = async (newTask) => {
    const tempId = `temp_${Date.now()}`;
    setTasks(prev => [...prev, { ...newTask, id: tempId }]);
    
    await createTask(newTask);
    // Real-time update will sync with server state
  };

  // Sync with server on real-time events
  useRealtimeUpdates({
    events: ['task_created', 'task_updated', 'task_deleted'],
    onUpdate: async () => {
      const freshData = await fetchTasks();
      setTasks(freshData);
    }
  });

  return (/* ... */);
}
```

## Integration with Authentication

The WebSocket connection is automatically managed by the authentication context:

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (user && accessToken) {
    websocketService.connect(accessToken);
  } else {
    websocketService.disconnect();
  }
  
  return () => {
    websocketService.disconnect();
  };
}, [user, accessToken]);
```

## Backend Integration

The WebSocket service connects to the Django Channels endpoint:

- **Endpoint**: `ws://host/ws/notifications/?token=<jwt_token>`
- **Authentication**: JWT token passed as query parameter
- **Protocol**: Standard WebSocket protocol

See backend documentation for more details on available events and message formats.

## Best Practices

### 1. Use Declarative Subscriptions

✅ **Good**: Use `useRealtimeUpdates` hook

```typescript
useRealtimeUpdates({
  events: ['lead_created'],
  onUpdate: fetchLeads
});
```

❌ **Avoid**: Manual subscription management

```typescript
useEffect(() => {
  const unsub = websocketService.on('lead_created', () => fetchLeads());
  return () => unsub();
}, []);
```

### 2. Debounce Expensive Operations

If your update callback is expensive (e.g., large data fetch), debounce it:

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedRefetch = useDebouncedCallback(
  () => fetchExpensiveData(),
  500 // Wait 500ms after last event
);

useRealtimeUpdates({
  events: ['data_changed'],
  onUpdate: debouncedRefetch
});
```

### 3. Conditional Enabling

Disable updates when component is not visible or user has paused updates:

```typescript
const isVisible = usePageVisibility();

useRealtimeUpdates({
  events: ['lead_created'],
  onUpdate: fetchLeads,
  enabled: isVisible // Only update when page is visible
});
```

### 4. Combine Related Events

Group related events together for efficiency:

```typescript
// Good: Single subscription for all lead events
useRealtimeUpdates({
  events: ['lead_created', 'lead_deleted', 'lead_updated'],
  onUpdate: fetchLeads
});

// Avoid: Multiple subscriptions for same data
useRealtimeUpdates({ events: ['lead_created'], onUpdate: fetchLeads });
useRealtimeUpdates({ events: ['lead_deleted'], onUpdate: fetchLeads });
useRealtimeUpdates({ events: ['lead_updated'], onUpdate: fetchLeads });
```

### 5. Handle Errors Gracefully

Wrap update callbacks in error handlers:

```typescript
useRealtimeUpdates({
  events: ['lead_created'],
  onUpdate: async () => {
    try {
      await fetchLeads();
    } catch (error) {
      console.error('Failed to refresh leads:', error);
      // Show error toast, retry, etc.
    }
  }
});
```

## Troubleshooting

### Connection Issues

**Problem**: WebSocket not connecting

**Solutions**:
1. Check network connectivity
2. Verify JWT token is valid (not expired)
3. Check backend WebSocket endpoint is running
4. Check CORS and WebSocket proxy configuration

**Debug**:
```typescript
// Check connection status
console.log('Connected:', websocketService.isConnected());

// Subscribe to all events to see what's happening
websocketService.on('all', (msg) => {
  console.log('WebSocket event:', msg);
});
```

### Events Not Triggering

**Problem**: Update callback not being called

**Solutions**:
1. Verify event type matches backend event name
2. Check if `enabled` prop is `true`
3. Ensure callback function is stable (use `useCallback`)
4. Check browser console for WebSocket errors

**Debug**:
```typescript
useRealtimeUpdates({
  events: ['lead_created'],
  onUpdate: () => {
    console.log('Update callback called!'); // Add debug log
    fetchLeads();
  }
});
```

### Multiple Reconnections

**Problem**: WebSocket keeps reconnecting

**Solution**: This is normal behavior when connection drops. The service will retry up to 5 times with exponential backoff. If it keeps failing, check:
1. Backend server is running
2. Network is stable
3. No firewall blocking WebSocket connections

## Performance Considerations

### Connection Overhead

- WebSocket connection is established once per session
- Ping/pong keepalive sent every 30 seconds
- Minimal bandwidth usage for text-based JSON messages

### Memory Usage

- Event handlers are automatically cleaned up on component unmount
- Multiple subscriptions to same event are deduplicated
- No memory leaks from abandoned subscriptions

### Battery Impact (Mobile)

- Consider disabling real-time updates on mobile devices to save battery
- Use page visibility API to pause updates when app is in background

```typescript
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const isVisible = usePageVisibility();

useRealtimeUpdates({
  events: ['lead_created'],
  onUpdate: fetchLeads,
  enabled: !isMobile || isVisible // Disable on mobile background
});
```

## Migration Guide

### From Polling to Real-Time Updates

**Before** (Polling every 30 seconds):

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchLeads();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

**After** (Real-time updates):

```typescript
useRealtimeUpdates({
  events: ['lead_created', 'lead_deleted'],
  onUpdate: fetchLeads
});
```

**Benefits**:
- Instant updates (no 30-second delay)
- Reduced server load (no polling requests)
- Lower bandwidth usage
- Better user experience

## Future Enhancements

Potential improvements to the real-time update system:

1. **Message Queuing**: Buffer messages during network interruptions and replay on reconnection
2. **Presence Indicators**: Show which users are online
3. **Typing Indicators**: Show when another user is editing a record
4. **Optimistic Locking**: Prevent conflicting edits with version control
5. **Selective Updates**: Only update specific records instead of full refetch
6. **Binary Protocol**: Use more efficient binary message format for large payloads

## Related Documentation

- [WebSocket Backend Documentation](../backend/websocket-api.md)
- [Django Channels Setup](../backend/django-channels.md)
- [Authentication System](./authentication.md)
