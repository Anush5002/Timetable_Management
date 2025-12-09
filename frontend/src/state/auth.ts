import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '@/lib/auth';
import { UserRole } from '@/types/domain';
import { apiClient } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.post<{
            id: number;
            name: string;
            role: string;
            username: string;
            department?: string | null;
          }>('/api/login', { username, password });

          const normalizedRole = mapBackendRole(response.role);
          const token =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${response.username}-${Date.now()}`;
          const user: AuthUser = {
            id: String(response.id),
            name: response.name,
            email: `${response.username}@timetable.local`,
            username: response.username,
            department: response.department ?? null,
            role: normalizedRole,
            avatar: '',
            isActive: true,
            token,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      updateProfile: (updates: Partial<AuthUser>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...updates, updatedAt: new Date().toISOString() }
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

function mapBackendRole(role: string): UserRole {
  const normalized = role.toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized.includes('teacher') || normalized.includes('it_head')) return 'teacher';
  if (normalized.includes('student')) return 'student';
  return 'support_staff';
}