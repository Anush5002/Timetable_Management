import { useEffect, useState } from 'react';
import { useAuthStore } from '@/state/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  BookOpen,
  Building,
  AlertTriangle,
  Clock,
  TrendingUp,
  Bell
} from 'lucide-react';
import { useTimetableStore } from '@/state/timetable';
import { apiClient } from '@/lib/api';

type StatsResponse = {
  users: number;
  teachers: number;
  students: number;
  rooms: number;
  courses: number;
  timetableEntries: number;
};

type UpcomingClass = {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  time: string;
  day: string;
  students: number;
};

type RecentActivity = {
  id: string;
  action: string;
  time: string;
  type: string;
};

const fallbackStats = {
  totalCourses: 42,
  totalTeachers: 18,
  totalStudents: 287,
  totalRooms: 15,
  utilizationRate: 78,
  upcomingClasses: 12,
  recentChanges: 5
};

const fallbackUpcomingClasses: UpcomingClass[] = [
  {
    id: '1',
    subject: 'Operating System',
    teacher: 'Mrs. Aparna Sawant',
    room: 'Room 101',
    time: '09:00 - 10:00',
    students: 35,
    day: 'Monday'
  },
  {
    id: '2',
    subject: 'Computer Science Lab',
    teacher: 'Dr. Deepali Joshi',
    room: 'Lab 205',
    time: '10:00 - 12:00',
    students: 28,
    day: 'Monday'
  },
  {
    id: '3',
    subject: 'Computer Networks',
    teacher: 'Mrs. Ranjana Jadhav',
    room: 'Room 303',
    time: '14:00 - 15:00',
    students: 22,
    day: 'Monday'
  }
];

const fallbackRecentActivity: RecentActivity[] = [
  {
    id: '1',
    action: 'Timetable updated for Computer Science Year 2',
    time: '2 hours ago',
    type: 'update'
  },
  {
    id: '2',
    action: 'New room added: Conference Room A',
    time: '5 hours ago',
    type: 'create'
  },
  {
    id: '3',
    action: 'Teacher availability updated: Mrs. Aparna Sawant',
    time: '1 day ago',
    type: 'update'
  }
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const { conflicts } = useTimetableStore();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>(fallbackUpcomingClasses);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>(fallbackRecentActivity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeConflicts = conflicts.filter(c => !c.isResolved);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const params: any = { day: currentDay, limit: 3 };

        // Map frontend role to backend role
        const getBackendRole = (role: string): string => {
          if (role === 'admin') return 'Admin';
          if (role === 'teacher') return 'Teacher';
          if (role === 'student') return 'Student';
          return 'Admin'; // Default or fallback role
        };

        if (user) {
          params.user_id = user.id;
          params.role = getBackendRole(user.role);
        }

        const [statsResponse, timetableResponse] = await Promise.all([
          apiClient.get<StatsResponse>('/api/stats'),
          apiClient.get<any[]>('/api/timetable', { params })
        ]);

        if (!mounted) return;

        setStats(statsResponse);
        const classesFromApi: UpcomingClass[] = timetableResponse.map(item => ({
          id: String(item.schedule_id),
          subject: item.subject_name ?? 'Class',
          teacher: item.teacher_name ?? 'TBD',
          room: item.room_name ?? 'Room',
          time: `${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)}`,
          day: item.day_of_week,
          students: Array.isArray(item.student_group) ? item.student_group.length : 0
        }));

        setUpcomingClasses(classesFromApi.length ? classesFromApi : fallbackUpcomingClasses);
        setRecentActivity(
          classesFromApi.length
            ? classesFromApi.map(cls => ({
              id: `recent-${cls.id}`,
              action: `Scheduled ${cls.subject} on ${cls.day}`,
              time: cls.time,
              type: 'update'
            }))
            : fallbackRecentActivity
        );
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setStats(null);
        setUpcomingClasses(fallbackUpcomingClasses);
        setRecentActivity(fallbackRecentActivity);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const statsForDashboard = stats
    ? {
      totalCourses: stats.courses,
      totalTeachers: stats.teachers,
      totalStudents: stats.students,
      totalRooms: stats.rooms,
      utilizationRate: stats.rooms
        ? Math.min(100, Math.round((stats.timetableEntries / (stats.rooms * 8)) * 100))
        : 0,
      upcomingClasses: stats.timetableEntries,
      recentChanges: stats.timetableEntries
    }
    : fallbackStats;

  const getRoleDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <AdminDashboard
            stats={statsForDashboard}
            upcomingClasses={upcomingClasses}
            recentActivity={recentActivity}
            loading={loading}
            error={error}
          />
        );
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      case 'support_staff':
        return <SupportStaffDashboard />;
      default:
        return (
          <AdminDashboard
            stats={statsForDashboard}
            upcomingClasses={upcomingClasses}
            recentActivity={recentActivity}
            loading={loading}
            error={error}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your timetable system today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeConflicts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {activeConflicts.length} conflicts
            </Badge>
          )}
        </div>
      </div>

      {getRoleDashboard()}
    </div>
  );
}

function AdminDashboard({
  stats,
  upcomingClasses,
  recentActivity,
  loading,
  error
}: {
  stats: typeof fallbackStats;
  upcomingClasses: UpcomingClass[];
  recentActivity: RecentActivity[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last semester
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              3 on leave this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              +15 new enrollments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Room Utilization</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.utilizationRate}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +5% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">Unable to refresh data: {error}</p>
            )}
            {loading && !upcomingClasses.length && (
              <p className="text-sm text-muted-foreground">Loading schedule...</p>
            )}
            {upcomingClasses.map((class_) => (
              <div key={class_.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                <div>
                  <p className="font-medium">{class_.subject}</p>
                  <p className="text-sm text-muted-foreground">{class_.teacher}</p>
                  <p className="text-sm text-muted-foreground">{class_.room}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{class_.time}</p>
                  <p className="text-sm text-muted-foreground">{class_.students} students</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View Full Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TeacherDashboard() {
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user) return;
      try {
        const data = await apiClient.get<any[]>('/api/timetable', {
          params: {
            user_id: user.id,
            role: 'Teacher'
          }
        });
        // Filter for "Today" (mocking Monday for demo as requested, or actual day)
        // const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const today = 'Monday'; // Mocking Monday as per user request for demo visibility
        const todaySchedule = data.filter((item: any) => item.day_of_week === today);
        setSchedule(todaySchedule);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule (Monday)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : schedule.length > 0 ? (
            schedule.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-semibold">{item.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{item.class_name} • {item.room_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No classes scheduled for today.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 border rounded-lg bg-yellow-500/10 border-yellow-500/50">
            <h4 className="font-semibold flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" /> New Assignment
            </h4>
            <p className="text-sm mt-1">You have a new assignment submission from <strong>CS-FY-A</strong> pending review.</p>
            <p className="text-xs text-muted-foreground mt-2">Due: Today, 5:00 PM</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="outline" className="w-full justify-start">Update Availability</Button>
          <Button variant="outline" className="w-full justify-start">View Syllabus</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentDashboard() {
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user) return;
      try {
        // Use my-schedule endpoint which merges core + electives
        const data = await apiClient.get<any[]>('/api/my-schedule', {
          params: { student_id: user.id }
        });
        const today = 'Monday'; // Mocking Monday
        const todaySchedule = data.filter((item: any) => item.day_of_week === today);
        setSchedule(todaySchedule);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule (Monday)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : schedule.length > 0 ? (
            schedule.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-accent/50 rounded-lg">
                <div>
                  <p className="font-semibold">{item.subject_name} <span className="text-xs font-normal bg-primary/10 px-1 rounded">{item.type || 'Lecture'}</span></p>
                  <p className="text-sm text-muted-foreground">{item.teacher_name} • {item.room_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No classes scheduled for today.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 border rounded-lg bg-blue-500/10 border-blue-500/50">
            <h4 className="font-semibold flex items-center gap-2 text-blue-600">
              New Assignment: Machine Learning
            </h4>
            <p className="text-sm mt-1">"Implement Gradient Descent".</p>
            <p className="text-xs text-muted-foreground mt-2">Prof. Rohan Verma • Due: Monday, 11:59 PM</p>
            <Button size="sm" className="mt-2 w-full">Submit Now</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electives</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Registration for next semester electives is open.</p>
          <Button className="w-full" asChild>
            <a href="/electives">Browse Electives</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SupportStaffDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Room Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Monitor and manage room bookings.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">View and update room maintenance schedules.</p>
        </CardContent>
      </Card>
    </div>
  );
}