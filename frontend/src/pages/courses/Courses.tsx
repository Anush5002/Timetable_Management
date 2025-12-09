import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, BookOpen, Clock, Trash, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/state/auth';

type Course = {
  course_id: number;
  course_name: string;
  credits: number;
  subject_hours: number;
  year: 'SY' | 'TY';
};

type Subject = {
  subject_id: number;
  course_id: number;
  subject_name: string;
  hours_per_week: number;
  subject_hours?: number;
  type: 'Lab' | 'Theory' | 'Seminar';
  course_name?: string;
};

export default function Courses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'subjects'>('all');
  const [selectedYear, setSelectedYear] = useState<'all' | 'SY' | 'TY'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [coursesData, subjectsData] = await Promise.all([
          apiClient.get<Course[]>(selectedYear !== 'all' ? `/api/courses?year=${selectedYear}` : '/api/courses'),
          apiClient.get<Subject[]>('/api/subjects')
        ]);
        if (!mounted) return;
        setCourses(coursesData);
        setSubjects(subjectsData);
      } catch (err) {
        console.error('Failed to load data', err);
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
  }, [selectedYear]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course =>
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(course.course_id).includes(searchTerm)
    );
  }, [courses, searchTerm]);

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(subject =>
        subject.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (subject.course_name && subject.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(subject.subject_id).includes(searchTerm)
      );
  }, [subjects, searchTerm]);

  const tabs = [
    { value: 'all', label: 'All Courses' },
    { value: 'subjects', label: 'Subjects' }
  ] as const;

  const yearTabs = [
    { value: 'all', label: 'All Years' },
    { value: 'SY', label: 'Second Year (SY)' },
    { value: 'TY', label: 'Third Year (TY)' }
  ] as const;

  const deleteCourse = async (courseId: number) => {
    if (!confirm('Remove this course?')) return;
    try {
      await apiClient.delete(`/api/courses/${courseId}`);
      setCourses(prev => prev.filter(course => course.course_id !== courseId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const deleteSubject = async (subjectId: number) => {
    if (!confirm('Remove this subject?')) return;
    try {
      await apiClient.delete(`/api/subjects/${subjectId}`);
      setSubjects(prev => prev.filter(subject => subject.subject_id !== subjectId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete subject');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground">
            Manage courses, subjects, and their assignments
          </p>
        </div>
        {!isTeacher && (
          <Button className="gap-2" onClick={() => navigate('/courses/new')}>
            <Plus className="h-4 w-4" />
            Add {selectedTab === 'subjects' ? 'Subject' : 'Course'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={selectedTab === 'subjects' ? 'Search subjects...' : 'Search courses...'}
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

      <Tabs value={selectedYear} onValueChange={(value) => setSelectedYear(value as typeof selectedYear)}>
        <TabsList>
          {yearTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as typeof selectedTab)} className="mt-4">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {selectedTab === 'subjects' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading && <CourseSkeleton />}
              {!isLoading && filteredSubjects.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {error ? `Unable to load subjects: ${error}` : 'No subjects found'}
                  </CardContent>
                </Card>
              )}
              {filteredSubjects.map(subject => (
                <SubjectCard 
                  key={subject.subject_id} 
                  subject={subject} 
                  onDelete={() => deleteSubject(subject.subject_id)}
                  onEdit={() => navigate(`/courses/edit/subject/${subject.subject_id}`)}
                  isTeacher={isTeacher}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading && <CourseSkeleton />}
              {!isLoading && filteredCourses.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {error ? `Unable to load courses: ${error}` : 'No courses found'}
                  </CardContent>
                </Card>
              )}
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.course_id} 
                  course={course} 
                  onDelete={() => deleteCourse(course.course_id)}
                  onEdit={() => navigate(`/courses/edit/${course.course_id}`)}
                  isTeacher={isTeacher}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  onDelete: () => void;
  onEdit: () => void;
  isTeacher: boolean;
}

function CourseCard({ course, onDelete, onEdit, isTeacher }: CourseCardProps) {
  const hoursPerWeek = Math.round(course.subject_hours / 16); // rough conversion for display
  
  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.course_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">ID #{course.course_id}</Badge>
              <Badge variant="default">{course.year}</Badge>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground flex flex-col items-end">
            <span>{course.credits} credits</span>
            <span>{course.subject_hours} hrs total</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Weekly effort (approx)</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{hoursPerWeek} hrs/week</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Scheduling Summary</p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Sessions planned via timetable
            </span>
            {!isTeacher && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="gap-1" onClick={onDelete}>
                  <Trash className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SubjectCardProps {
  subject: Subject;
  onDelete: () => void;
  onEdit: () => void;
  isTeacher: boolean;
}

function SubjectCard({ subject, onDelete, onEdit, isTeacher }: SubjectCardProps) {
  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subject.subject_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">ID #{subject.subject_id}</Badge>
              <Badge variant="outline">{subject.type}</Badge>
              {subject.course_name && (
                <Badge variant="default">{subject.course_name}</Badge>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground flex flex-col items-end">
            <span>{subject.hours_per_week} hrs/week</span>
            {subject.subject_hours && (
              <span>{subject.subject_hours} hrs total</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Course: {subject.course_name || `Course ID #${subject.course_id}`}</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Subject Details</p>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {subject.hours_per_week} hrs/week
              {subject.subject_hours && ` • ${subject.subject_hours} hrs total`}
            </span>
            {!isTeacher && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="gap-1" onClick={onDelete}>
                  <Trash className="h-3 w-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, idx) => (
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