import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  role: string;
}

interface StaffProfileChipProps {
  userId: string;
  showDetails?: boolean;
}

// Cache for profiles to avoid repeated fetches
const profileCache: Record<string, Profile | null> = {};

export default function StaffProfileChip({ userId, showDetails = true }: StaffProfileChipProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Check cache first
      if (profileCache[userId]) {
        setProfile(profileCache[userId]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch user data from Django backend
        const response = await apiClient.getUsers();
        // Handle paginated response from Django REST framework
        const users = Array.isArray(response) ? response : (response as any).results || [];
        
        // Try to find user by ID, username, or string representation of ID
        const user = users.find((u: any) => 
          u.id === userId || 
          u.id === parseInt(userId) || 
          u.id.toString() === userId || 
          u.username === userId
        );
        
        if (user) {
          const profileData: Profile = {
            id: user.id.toString(),
            user_id: user.username,
            name: `${user.first_name} ${user.last_name}`.trim() || user.username,
            email: user.email,
            phone: user.phone,
            address: null, // Django User model doesn't have address field
            status: 'active', // Default status
            role: user.role,
          };

          if (cancelled) return;

          // Cache the result with multiple keys for better lookup
          profileCache[userId] = profileData;
          profileCache[user.id] = profileData;
          profileCache[user.id.toString()] = profileData;
          profileCache[user.username] = profileData;

          setProfile(profileData);
        } else {
          if (cancelled) return;
          profileCache[userId] = null;
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (!cancelled) {
          profileCache[userId] = null;
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary text-primary-foreground';
      case 'manager':
        return 'bg-secondary text-secondary-foreground';
      case 'employee':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <span className="text-muted-foreground text-sm">Loading...</span>;
  }

  if (!profile) {
    return <span className="text-muted-foreground text-sm">Unknown</span>;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const chipContent = (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarFallback className={`text-xs ${getRoleColor(profile.role)}`}>
          {getInitials(profile.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium leading-none">{profile.name}</span>
        <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
      </div>
    </div>
  );

  if (!showDetails) {
    return chipContent;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          {chipContent}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={`text-lg ${getRoleColor(profile.role)}`}>
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">{profile.name}</h4>
              <Badge variant="outline" className="capitalize mt-1">
                {profile.role}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            {profile.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.address}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Status: <span className={profile.status === 'active' ? 'text-success' : 'text-destructive'}>{profile.status}</span>
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
