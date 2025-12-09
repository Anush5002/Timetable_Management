import { User, UserRole } from '@/types/domain';

export interface AuthUser extends User {
  token: string;
  username: string;
  department?: string | null;
}

export const ROLE_PERMISSIONS = {
  admin: [
    'manage_users',
    'manage_courses',
    'manage_rooms',
    'manage_timetable',
    'view_reports',
    'manage_settings',
    'export_data'
  ],
  teacher: [
    'view_timetable',
    'manage_availability',
    'view_courses',
    'view_students',
    'update_profile'
  ],
  student: [
    'view_timetable',
    'view_courses',
    'select_electives',
    'view_schedule',
    'update_profile'
  ],
  support_staff: [
    'manage_rooms',
    'view_courses',
    'update_profile'
  ]
} as const;

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] as readonly string[];
  return permissions.includes(permission);
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, string[]> = {
    '/dashboard': ['admin', 'teacher', 'student', 'support_staff'],
    '/courses': ['admin', 'teacher'],
    '/people': ['admin', 'teacher'],
    '/timetable': ['admin', 'teacher', 'student'],
    '/rooms': ['admin', 'support_staff'],
    '/electives': ['student'],
    '/reports': ['admin'],
    '/settings': ['admin']
  };

  const allowedRoles = routePermissions[route] || [];
  return allowedRoles.includes(userRole);
}

export const mockAuthUser: AuthUser = {
  id: '1',
  name: 'Admin User',
  email: 'admin@university.edu',
  role: 'admin',
  username: 'admin',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  isActive: true,
  token: 'mock-jwt-token-admin',
  department: 'Administration',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};