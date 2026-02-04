import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

// Dashboard & Navigation Icons
export const DashboardIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" fill={color}/>
    <rect x="14" y="3" width="7" height="7" rx="1" fill={color}/>
    <rect x="3" y="14" width="7" height="7" rx="1" fill={color}/>
    <rect x="14" y="14" width="7" height="7" rx="1" fill={color}/>
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="9" cy="7" r="4" fill={color}/>
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill={color}/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 21v-2a4 4 0 0 0-3-3.85" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const LeadsIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" fill={color}/>
    <circle cx="9" cy="7" r="4" fill={color}/>
  </svg>
);

export const TasksIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" fill={color}/>
    <rect x="6" y="8" width="3" height="2" rx="1" fill="white"/>
    <rect x="6" y="12" width="3" height="2" rx="1" fill="white"/>
    <rect x="6" y="16" width="3" height="2" rx="1" fill="white"/>
    <rect x="11" y="8" width="7" height="2" rx="1" fill="white"/>
    <rect x="11" y="12" width="5" height="2" rx="1" fill="white"/>
    <rect x="11" y="16" width="6" height="2" rx="1" fill="white"/>
  </svg>
);

export const ProjectsIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" fill={color}/>
    <rect x="7" y="7" width="4" height="4" rx="1" fill="white"/>
    <rect x="13" y="7" width="4" height="4" rx="1" fill="white"/>
    <rect x="7" y="13" width="10" height="4" rx="1" fill="white"/>
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" fill={color}/>
    <rect x="3" y="4" width="18" height="6" rx="2" fill={color}/>
    <rect x="6" y="2" width="2" height="4" rx="1" fill={color}/>
    <rect x="16" y="2" width="2" height="4" rx="1" fill={color}/>
    <circle cx="8" cy="14" r="1.5" fill="white"/>
    <circle cx="12" cy="14" r="1.5" fill="white"/>
    <circle cx="16" cy="14" r="1.5" fill="white"/>
    <circle cx="8" cy="18" r="1.5" fill="white"/>
    <circle cx="12" cy="18" r="1.5" fill="white"/>
  </svg>
);

export const ReportsIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" fill={color}/>
    <rect x="7" y="12" width="2" height="6" fill="white"/>
    <rect x="11" y="8" width="2" height="10" fill="white"/>
    <rect x="15" y="6" width="2" height="12" fill="white"/>
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" fill={color}/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill={color}/>
  </svg>
);

// Action Icons
export const PlusIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="11" y="4" width="2" height="16" rx="1" fill={color}/>
    <rect x="4" y="11" width="16" height="2" rx="1" fill={color}/>
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill={color}/>
  </svg>
);

export const DeleteIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <rect x="8" y="6" width="8" height="14" rx="2" fill={color}/>
    <rect x="10" y="2" width="4" height="4" rx="1" fill={color}/>
    <rect x="10" y="10" width="1" height="6" fill="white"/>
    <rect x="13" y="10" width="1" height="6" fill="white"/>
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="11" cy="11" r="8" fill={color}/>
    <circle cx="11" cy="11" r="5" fill="white"/>
    <path d="m21 21-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" fill={color}/>
  </svg>
);

// Communication Icons
export const PhoneIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="3" fill={color}/>
    <rect x="7" y="4" width="10" height="14" rx="1" fill="white"/>
    <circle cx="12" cy="19" r="1" fill="white"/>
  </svg>
);

export const EmailIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" fill={color}/>
    <path d="m2 6 10 7 10-7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={color}/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Status Icons
export const CheckIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color}/>
    <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color}/>
    <path d="m15 9-6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="m9 9 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color}/>
    <path d="M12 16v-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="1" fill="white"/>
  </svg>
);

// File & Document Icons
export const FileIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={color}/>
    <path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="8" y="12" width="8" height="1" fill="white"/>
    <rect x="8" y="15" width="6" height="1" fill="white"/>
    <rect x="8" y="18" width="4" height="1" fill="white"/>
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="14" width="16" height="6" rx="2" fill={color}/>
    <path d="M12 4v10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="m8 8 4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="14" width="16" height="6" rx="2" fill={color}/>
    <path d="M12 4v10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="m8 10 4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Navigation Icons
export const ChevronLeftIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="m15 18-6-6 6-6" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="m9 18 6-6-6-6" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MenuIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="6" width="18" height="2" rx="1" fill={color}/>
    <rect x="3" y="11" width="18" height="2" rx="1" fill={color}/>
    <rect x="3" y="16" width="18" height="2" rx="1" fill={color}/>
  </svg>
);

// Building & Location Icons
export const BuildingIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" fill={color}/>
    <rect x="7" y="5" width="2" height="2" fill="white"/>
    <rect x="11" y="5" width="2" height="2" fill="white"/>
    <rect x="15" y="5" width="2" height="2" fill="white"/>
    <rect x="7" y="9" width="2" height="2" fill="white"/>
    <rect x="11" y="9" width="2" height="2" fill="white"/>
    <rect x="15" y="9" width="2" height="2" fill="white"/>
    <rect x="7" y="13" width="2" height="2" fill="white"/>
    <rect x="11" y="13" width="2" height="2" fill="white"/>
    <rect x="15" y="13" width="2" height="2" fill="white"/>
    <rect x="10" y="17" width="4" height="5" fill="white"/>
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill={color}/>
    <circle cx="12" cy="10" r="3" fill="white"/>
  </svg>
);

// Loading Icon
export const LoaderIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" strokeOpacity="0.25"/>
    <path d="M4 12a8 8 0 0 1 8-8V2.5a1.5 1.5 0 0 1 3 0V4a8 8 0 0 1-8 8" fill={color}/>
  </svg>
);

// Currency Icon
export const CurrencyIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="2" width="12" height="20" rx="2" fill={color}/>
    <path d="M12 6v12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 9h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 15h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Activity Icon
export const ActivityIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="10" width="20" height="4" rx="2" fill={color}/>
    <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" stroke={color} strokeWidth="2"/>
    <path d="M6 14v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" stroke={color} strokeWidth="2"/>
  </svg>
);

// Logout Icon
export const LogoutIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 17l5-5-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// User Icon
export const UserIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="5" fill={color}/>
    <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" fill={color}/>
  </svg>
);

// Lock Icon
export const LockIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" fill={color}/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill="white"/>
  </svg>
);

// Eye Icon
export const EyeIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
  </svg>
);

// Eye Off Icon
export const EyeOffIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="m1 1 22 22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Arrow Right Icon
export const ArrowRightIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="m12 5 7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// More Horizontal Icon
export const MoreHorizontalIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="1" fill={color}/>
    <circle cx="19" cy="12" r="1" fill={color}/>
    <circle cx="5" cy="12" r="1" fill={color}/>
  </svg>
);

// Trash Icon
export const TrashIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <rect x="8" y="6" width="8" height="14" rx="2" fill={color}/>
    <rect x="10" y="2" width="4" height="4" rx="1" fill={color}/>
    <rect x="10" y="10" width="1" height="6" fill="white"/>
    <rect x="13" y="10" width="1" height="6" fill="white"/>
  </svg>
);

// Eye Icon for viewing
export const ViewIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
  </svg>
);

// Calendar Off Icon (for leaves/holidays)
export const CalendarOffIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="none"/>
    <rect x="3" y="4" width="18" height="6" rx="2" fill={color}/>
    <rect x="6" y="2" width="2" height="4" rx="1" fill={color}/>
    <rect x="16" y="2" width="2" height="4" rx="1" fill={color}/>
    <path d="m3 3 18 18" stroke="red" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Target Icon
export const TargetIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill={color}/>
  </svg>
);

// Megaphone Icon (for announcements)
export const MegaphoneIcon: React.FC<IconProps> = ({ className = "", size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 11v3a1 1 0 0 0 1 1h1l4 4v-12l-4 4H4a1 1 0 0 0-1 1z" fill={color}/>
    <path d="M13.5 3.5c-.5 0-1 .5-1 1v14c0 .5.5 1 1 1s1-.5 1-1v-14c0-.5-.5-1-1-1z" fill={color}/>
    <path d="M18.5 8.5c0 1.5-1 3-2.5 3.5v1c1.5-.5 2.5-2 2.5-3.5s-1-3-2.5-3.5v1c1.5.5 2.5 2 2.5 3.5z" fill={color}/>
  </svg>
);