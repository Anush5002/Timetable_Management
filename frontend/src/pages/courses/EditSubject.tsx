import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

type Subject = {
  subject_id: number;
  course_id: number;
  subject_name: string;
  hours_per_week: number;
  subject_hours?: number;
  type: 'Lab' | 'Theory' | 'Seminar';
  course_name?: string;
};

export default function EditSubject() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({
    subject_name: '',
    selected_course_id: '',
    hours_per_week: '',
    subject_hours: '',
    type: 'Theory' as 'Lab' | 'Theory' | 'Seminar'
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError('Subject ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const [subjectsData, coursesData] = await Promise.all([
          apiClient.get<Subject[]>('/api/subjects'),
          apiClient.get<any[]>('/api/courses')
        ]);
        
        setCourses(coursesData);
        const subject = subjectsData.find(s => s.subject_id === Number(id));
        
        if (!subject) {
          setError('Subject not found');
          return;
        }

        setForm({
          subject_name: subject.subject_name,
          selected_course_id: String(subject.course_id),
          hours_per_week: String(subject.hours_per_week),
          subject_hours: subject.subject_hours ? String(subject.subject_hours) : '',
          type: subject.type
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subject');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError(null);
    setIsSaving(true);
    try {
      await apiClient.patch(`/api/subjects/${id}`, {
        course_id: Number(form.selected_course_id),
        subject_name: form.subject_name,
        hours_per_week: Number(form.hours_per_week),
        subject_hours: form.subject_hours ? Number(form.subject_hours) : undefined,
        type: form.type
      });
      navigate('/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subject');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject_name">Subject Name</Label>
                <Input
                  id="subject_name"
                  value={form.subject_name}
                  onChange={(e) => handleChange('subject_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={form.selected_course_id} onValueChange={(value) => handleChange('selected_course_id', value)}>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hours_per_week">Hours per Week</Label>
                <Input
                  id="hours_per_week"
                  type="number"
                  value={form.hours_per_week}
                  onChange={(e) => handleChange('hours_per_week', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject_hours">Subject Hours</Label>
                <Input
                  id="subject_hours"
                  type="number"
                  value={form.subject_hours}
                  onChange={(e) => handleChange('subject_hours', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Type</Label>
              <Select value={form.type} onValueChange={(value: 'Lab' | 'Theory' | 'Seminar') => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Theory">Theory</SelectItem>
                  <SelectItem value="Lab">Lab</SelectItem>
                  <SelectItem value="Seminar">Seminar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update Subject'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

