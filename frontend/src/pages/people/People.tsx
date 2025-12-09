import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Users, GraduationCap, UserCheck, Calendar, Trash, Building, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiClient } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/state/auth';

type Teacher = {
  teacher_id: number;
  name: string;
  max_hours_week: number;
  availability: Record<string, string[]> | string;
  vacation_days: string[] | string;
};

type Student = {
  student_id: number;
  name: string;
  enrolled_courses: number[] | string;
  roll_number?: string;
  class_id?: number;
  class_name?: string;
};

type SupportStaff = {
  staff_id: number;
  name: string;
  role: 'Technical Support' | 'Non-technical Support';
};

type Class = {
  class_id: number;
  class_name: string;
  department: string;
  year: string;
  division: string;
  building: string;
  floor: number;
  room_no: string;
};

export default function People() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('teachers');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [teacherData, studentData, supportStaffData, classesData] = await Promise.all([
          apiClient.get<Teacher[]>('/api/teachers'),
          apiClient.get<Student[]>('/api/students'),
          apiClient.get<SupportStaff[]>('/api/support-staff').catch(() => []), // Return empty array if endpoint fails
          apiClient.get<Class[]>('/api/classes').catch(() => [])
        ]);
        if (!mounted) return;
        setTeachers(teacherData);
        setStudents(studentData);
        setSupportStaff(supportStaffData || []);
        setClasses(classesData || []);
      } catch (err) {
        console.error('Failed to load people data', err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTeachers = useMemo(
    () =>
      teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(teacher.teacher_id).includes(searchTerm)
      ),
    [teachers, searchTerm]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(student.student_id).includes(searchTerm)
      ),
    [students, searchTerm]
  );

  const filteredSupportStaff = useMemo(
    () =>
      supportStaff.filter(staff =>
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(staff.staff_id).includes(searchTerm) ||
        staff.role.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [supportStaff, searchTerm]
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter(cls =>
        cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.room_no.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [classes, searchTerm]
  );

  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isClassDialogOpen, setClassDialogOpen] = useState(false);
  const [isAddClassOpen, setAddClassOpen] = useState(false);

  const [availabilityTeacher, setAvailabilityTeacher] = useState<Teacher | null>(null);
  const [isAvailabilityOpen, setAvailabilityOpen] = useState(false);
  const [scheduleClass, setScheduleClass] = useState<Class | null>(null);
  const [isScheduleOpen, setScheduleOpen] = useState(false);
  const handleDeleteTeacher = async (teacherId: number) => {
    if (!confirm('Remove this teacher?')) return;
    try {
      await apiClient.delete(`/api/teachers/${teacherId}`);
      setTeachers(prev => prev.filter(teacher => teacher.teacher_id !== teacherId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete teacher');
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Remove this student?')) return;
    try {
      await apiClient.delete(`/api/students/${studentId}`);
      setStudents(prev => prev.filter(student => student.student_id !== studentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete student');
    }
  };

  const handleDeleteSupportStaff = async (staffId: number) => {
    if (!confirm('Remove this support staff member?')) return;
    try {
      await apiClient.delete(`/api/support-staff/${staffId}`);
      setSupportStaff(prev => prev.filter(staff => staff.staff_id !== staffId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete support staff');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">People Management</h1>
          <p className="text-muted-foreground">
            Manage teachers, students, and their information
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {selectedTab === 'classes' && (
              <Button className="gap-2" onClick={() => setAddClassOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Class
              </Button>
            )}
            {selectedTab !== 'classes' && (
              <Button className="gap-2" onClick={() => navigate('/people/new')}>
                <Plus className="h-4 w-4" />
                Add Person
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="support">Support Staff</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <PeopleSkeleton />}
            {!isLoading && filteredTeachers.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {error ? `Unable to load teachers: ${error}` : 'No teachers found'}
                </CardContent>
              </Card>
            )}
            {filteredTeachers.map(teacher => (
              <TeacherCard
                key={teacher.teacher_id}
                teacher={teacher}
                onShowAvailability={() => {
                  setAvailabilityTeacher(teacher);
                  setAvailabilityOpen(true);
                }}
                onDelete={isAdmin ? () => handleDeleteTeacher(teacher.teacher_id) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <PeopleSkeleton />}
            {!isLoading && filteredStudents.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {error ? `Unable to load students: ${error}` : 'No students found'}
                </CardContent>
              </Card>
            )}
            {filteredStudents.map(student => (
              <StudentCard
                key={student.student_id}
                student={student}
                onDelete={isAdmin ? () => handleDeleteStudent(student.student_id) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <PeopleSkeleton />}
            {!isLoading && filteredSupportStaff.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {error ? `Unable to load support staff: ${error}` : 'No support staff found'}
                </CardContent>
              </Card>
            )}
            {filteredSupportStaff.map(staff => (
              <SupportStaffCard
                key={staff.staff_id}
                staff={staff}
                onDelete={isAdmin ? () => handleDeleteSupportStaff(staff.staff_id) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <PeopleSkeleton />}
            {!isLoading && filteredClasses.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {error ? `Unable to load classes: ${error}` : 'No classes found'}
                </CardContent>
              </Card>
            )}
            {filteredClasses.map(cls => (
              <ClassCard
                key={cls.class_id}
                classData={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setClassDialogOpen(true);
                }}
                onSchedule={(e) => {
                  e.stopPropagation();
                  setScheduleClass(cls);
                  setScheduleOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <AvailabilityDialog
        teacher={availabilityTeacher}
        open={isAvailabilityOpen}
        onOpenChange={setAvailabilityOpen}
      />
      <ClassScheduleDialog
        classData={scheduleClass}
        open={isScheduleOpen}
        onOpenChange={setScheduleOpen}
      />
      <ClassDialog
        classData={selectedClass}
        open={isClassDialogOpen}
        onOpenChange={setClassDialogOpen}
      />
      <AddClassDialog
        open={isAddClassOpen}
        onOpenChange={(val) => {
          setAddClassOpen(val);
          if (!val) {
            // Refresh classes when dialog closes
            apiClient.get<Class[]>('/api/classes')
              .then(setClasses)
              .catch(() => { });
          }
        }}
      />
    </div>
  );
}

interface TeacherCardProps {
  teacher: Teacher;
  onDelete?: () => void;
  onShowAvailability: () => void;
}

function TeacherCard({ teacher, onDelete, onShowAvailability }: TeacherCardProps) {
  const availability = normalizeAvailability(teacher.availability);
  const workloadPercentage = Math.min(
    100,
    Math.round((availability.totalHours / teacher.max_hours_week) * 100)
  );

  const { designation, name } = splitName(teacher.name);

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">ID #{teacher.teacher_id}</Badge>
              <Badge variant="outline">{teacher.max_hours_week}h/week</Badge>
              {designation && (
                <Badge variant="secondary" className="font-normal">
                  {designation}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Weekly Availability</p>
          <div className="flex flex-wrap gap-1">
            {availability.days.length ? (
              availability.days.map(slot => (
                <Badge key={slot.day} variant="outline" className="text-xs">
                  {slot.day}: {slot.hours}h
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-xs">
                No availability data
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Estimated workload</span>
            <span>{availability.totalHours}/{teacher.max_hours_week}h</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${workloadPercentage >= 100 ? 'bg-destructive' :
                workloadPercentage >= 80 ? 'bg-warning' : 'bg-primary'
                }`}
              style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{availability.days.length} active days</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span>
              {Array.isArray(teacher.vacation_days) ? teacher.vacation_days.length : 0} vacations
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onShowAvailability}>
            <Calendar className="h-3 w-3 mr-1" />
            Availability
          </Button>
          {onDelete && (
            <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={onDelete}>
              <Trash className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function splitName(fullName: string) {
  const designations = ['Asst. Prof.', 'Associate Prof.', 'Prof.', 'Dr.', 'HOD', 'Prof', 'Dr', 'Asst Prof', 'Associate Prof'];
  // Sort by length descending to match "Associate Prof." before "Prof."
  const sortedDesignations = designations.sort((a, b) => b.length - a.length);

  for (const d of sortedDesignations) {
    if (fullName.startsWith(d)) {
      return { designation: d, name: fullName.substring(d.length).trim() };
    }
  }
  return { designation: '', name: fullName };
}

interface StudentCardProps {
  student: Student;
  onDelete?: () => void;
}

function StudentCard({ student, onDelete }: StudentCardProps) {
  const courses = Array.isArray(student.enrolled_courses)
    ? student.enrolled_courses
    : typeof student.enrolled_courses === 'string'
      ? safeParse(student.enrolled_courses)
      : [];

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{student.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">ID #{student.student_id}</Badge>
              {student.roll_number && <Badge variant="outline">Roll: {student.roll_number}</Badge>}
              <Badge variant="outline">{student.class_name || `${courses.length} courses`}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Subjects</p>
            <p className="font-medium">{courses.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Subject IDs</p>
            <p className="font-medium truncate">
              {courses.length ? courses.join(', ') : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span>Sync timetable for detailed progress</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          {onDelete && (
            <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={onDelete}>
              <Trash className="h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeAvailability(availability: Teacher['availability']) {
  if (typeof availability === 'string') {
    return normalizeAvailability(safeParse(availability));
  }

  if (!availability || typeof availability !== 'object') {
    return { days: [], totalHours: 0 };
  }

  const days = Object.entries(availability).map(([day, slots]) => {
    const hours = Array.isArray(slots) ? slots.reduce((sum, slot) => sum + durationFromSlot(slot), 0) : 0;
    return { day, hours };
  });

  return {
    days,
    totalHours: days.reduce((sum, d) => sum + d.hours, 0)
  };
}

function durationFromSlot(slot: string) {
  const [start, end] = slot.split('-');
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return 0;
  return Math.max(0, (eh + em / 60) - (sh + sm / 60));
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function AvailabilityDialog({
  teacher,
  open,
  onOpenChange
}: {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (val: boolean) => void;
}) {
  if (!teacher) return null;
  const availability = normalizeAvailability(teacher.availability);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{teacher.name}'s Availability</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availability.days.length ? (
            availability.days.map(slot => (
              <div
                key={`${teacher.teacher_id}-${slot.day}`}
                className="rounded border border-border px-3 py-2 text-sm flex items-center justify-between"
              >
                <span className="font-medium">{slot.day}</span>
                <span>{slot.hours} hours</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No availability data.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SupportStaffCardProps {
  staff: SupportStaff;
  onDelete?: () => void;
}

function SupportStaffCard({ staff, onDelete }: SupportStaffCardProps) {
  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{staff.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">ID #{staff.staff_id}</Badge>
              <Badge variant="outline">{staff.role}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Role</p>
          <div className="flex items-center gap-2">
            <Badge variant={staff.role === 'Technical Support' ? 'default' : 'secondary'}>
              {staff.role}
            </Badge>
          </div>
        </div>

        {onDelete && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={onDelete}>
              <Trash className="h-3 w-3" />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassScheduleDialog({
  classData,
  open,
  onOpenChange
}: {
  classData: Class | null;
  open: boolean;
  onOpenChange: (val: boolean) => void;
}) {
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({
    course_id: '',
    subject_id: '',
    teacher_id: '',
    room_id: '',
    type: 'Lecture' as 'Lecture' | 'Lab' | 'Seminar',
    day_of_week: 'Monday' as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday',
    start_time: '',
    end_time: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && classData) {
      loadData();
    }
  }, [open, classData]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [coursesData, teachersData, roomsData] = await Promise.all([
        apiClient.get<any[]>('/api/courses'),
        apiClient.get<any[]>('/api/teachers'),
        apiClient.get<any[]>('/api/rooms')
      ]);
      setCourses(coursesData);
      setTeachers(teachersData);
      setRooms(roomsData);

      // Load subjects if course is selected
      if (form.course_id) {
        const subjectsData = await apiClient.get<any[]>(`/api/subjects?course_id=${form.course_id}`);
        setSubjects(subjectsData);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (form.course_id) {
      apiClient.get<any[]>(`/api/subjects?course_id=${form.course_id}`)
        .then(setSubjects)
        .catch(() => setSubjects([]));
    } else {
      setSubjects([]);
      setForm(prev => ({ ...prev, subject_id: '' }));
    }
  }, [form.course_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;

    setError(null);
    setIsSaving(true);
    try {
      // Map day names to database format (database uses full day names after migration)
      const dayMap: Record<string, string> = {
        'Monday': 'Monday',
        'Tuesday': 'Tuesday',
        'Wednesday': 'Wednesday',
        'Thursday': 'Thursday',
        'Friday': 'Friday'
      };

      await apiClient.post('/api/timetable', {
        course_id: Number(form.course_id),
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
        room_id: Number(form.room_id),
        class_id: classData.class_id,
        day_of_week: dayMap[form.day_of_week] || form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        student_group: [] // Not needed for class-based scheduling, or could fetch students if needed
      });

      // Reset form and close dialog
      setForm({
        course_id: '',
        subject_id: '',
        teacher_id: '',
        room_id: '',
        type: 'Lecture',
        day_of_week: 'Monday',
        start_time: '',
        end_time: ''
      });
      onOpenChange(false);
      alert('Schedule created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  if (!classData) return null;

  // Filter rooms by type
  const filteredRooms = rooms.filter(room => {
    if (form.type === 'Lab') return room.type === 'Lab';
    if (form.type === 'Lecture' || form.type === 'Seminar') return room.type === 'Lecture';
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule for {classData.class_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course_id">Course</Label>
              <Select value={form.course_id} onValueChange={(value) => setForm(prev => ({ ...prev, course_id: value, subject_id: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.course_id} value={String(course.course_id)}>
                      {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <Select value={form.subject_id} onValueChange={(value) => setForm(prev => ({ ...prev, subject_id: value }))} disabled={!form.course_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.subject_id} value={String(subject.subject_id)}>
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher_id">Teacher</Label>
              <Select value={form.teacher_id} onValueChange={(value) => setForm(prev => ({ ...prev, teacher_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.teacher_id} value={String(teacher.teacher_id)}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(value: 'Lecture' | 'Lab' | 'Seminar') => setForm(prev => ({ ...prev, type: value, room_id: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lecture">Lecture</SelectItem>
                  <SelectItem value="Lab">Lab</SelectItem>
                  <SelectItem value="Seminar">Seminar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room_id">Room</Label>
              <Select value={form.room_id} onValueChange={(value) => setForm(prev => ({ ...prev, room_id: value }))} disabled={!form.type}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map(room => (
                    <SelectItem key={room.room_id} value={String(room.room_id)}>
                      {room.room_name} ({room.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day_of_week">Day</Label>
              <Select value={form.day_of_week} onValueChange={(value: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday') => setForm(prev => ({ ...prev, day_of_week: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Create Schedule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PeopleSkeleton() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, idx) => (
        <Card key={idx} className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
interface ClassCardProps {
  classData: Class;
  onClick: () => void;
  onSchedule: (e: React.MouseEvent) => void;
}

function ClassCard({ classData, onClick, onSchedule }: ClassCardProps) {
  return (
    <Card className="hover:shadow-medium transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 rounded-lg">
            <AvatarFallback className="rounded-lg"><Building className="h-6 w-6" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{classData.class_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{classData.department}</Badge>
              <Badge variant="outline">{classData.year}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Location</p>
            <p className="font-medium">{classData.building}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Room</p>
            <p className="font-medium">{classData.room_no}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1" onClick={onSchedule}>
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassDialog({
  classData,
  open,
  onOpenChange
}: {
  classData: Class | null;
  open: boolean;
  onOpenChange: (val: boolean) => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open && classData) {
      loadStudents();
    }
  }, [open, classData]);

  async function loadStudents() {
    if (!classData) return;
    try {
      setIsLoading(true);
      const data = await apiClient.get<Student[]>(`/api/classes/${classData.class_id}/students`);
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!classData || !newStudentName || !newStudentRoll) return;

    try {
      setIsAdding(true);
      await apiClient.post(`/api/classes/${classData.class_id}/students`, {
        name: newStudentName,
        roll_number: newStudentRoll
      });
      setNewStudentName('');
      setNewStudentRoll('');
      loadStudents();
    } catch (err) {
      alert('Failed to add student');
    } finally {
      setIsAdding(false);
    }
  }
  async function handleRemoveStudent(studentId: number) {
    if (!confirm('Are you sure you want to remove this student?')) return;
    try {
      await apiClient.delete(`/api/students/${studentId}`);
      setStudents(prev => prev.filter(s => s.student_id !== studentId));
    } catch (err) {
      alert('Failed to remove student');
    }
  }

  if (!classData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{classData.class_name} - Students</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <form onSubmit={handleAddStudent} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Student Name</Label>
              <Input
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                placeholder="Enter name"
                required
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Roll No</Label>
              <Input
                value={newStudentRoll}
                onChange={e => setNewStudentRoll(e.target.value)}
                placeholder="Roll No"
                required
              />
            </div>
            <Button type="submit" disabled={isAdding}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </form>

          <div className="border rounded-lg">
            <div className="p-4 bg-muted/50 border-b font-medium grid grid-cols-12 gap-4">
              <div className="col-span-2">Roll No</div>
              <div className="col-span-8">Name</div>
              <div className="col-span-2 text-right">Action</div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No students in this class</div>
              ) : (
                students.map((student: any) => (
                  <div key={student.student_id} className="p-4 border-b last:border-0 grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2 font-mono text-sm">{student.roll_number || '-'}</div>
                    <div className="col-span-8 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {student.name}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveStudent(student.student_id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddClassDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    class_name: '',
    department: '',
    year: '',
    division: '',
    building: '',
    floor: '',
    room_no: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSaving(true);
      await apiClient.post('/api/classes', {
        ...formData,
        class_id: Number(formData.class_id),
        floor: Number(formData.floor)
      });
      setFormData({
        class_id: '',
        class_name: '',
        department: '',
        year: '',
        division: '',
        building: '',
        floor: '',
        room_no: ''
      });
      onOpenChange(false);
    } catch (err) {
      alert('Failed to create class');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class ID</Label>
              <Input
                type="number"
                value={formData.class_id}
                onChange={e => setFormData(prev => ({ ...prev, class_id: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input
                value={formData.class_name}
                onChange={e => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
                placeholder="e.g. CS-FY-A"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Dept</Label>
              <Input
                value={formData.department}
                onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                value={formData.year}
                onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Div</Label>
              <Input
                value={formData.division}
                onChange={e => setFormData(prev => ({ ...prev, division: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Building</Label>
            <Input
              value={formData.building}
              onChange={e => setFormData(prev => ({ ...prev, building: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                type="number"
                value={formData.floor}
                onChange={e => setFormData(prev => ({ ...prev, floor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Room No</Label>
              <Input
                value={formData.room_no}
                onChange={e => setFormData(prev => ({ ...prev, room_no: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>Create Class</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}