import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

export default function NewCourse() {
  const navigate = useNavigate();
  const [itemType, setItemType] = useState<'course' | 'subject'>('course');
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({
    course_id: '',
    course_name: '',
    credits: '',
    year: 'SY',
    subject_id: '',
    subject_name: '',
    hours_per_week: '',
    subject_hours: '',
    subject_type: 'Theory' as 'Lab' | 'Theory' | 'Seminar',
    selected_course_id: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await apiClient.get<any[]>('/api/courses');
        setCourses(data);
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    }
    loadCourses();
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (itemType === 'course') {
      await apiClient.post('/api/courses', {
        course_id: Number(form.course_id),
        course_name: form.course_name,
        credits: Number(form.credits),
          type: 'Lecture', // Default value for backward compatibility
          subject_hours: 0, // Default value, not used for courses
          year: form.year
        });
      } else {
        await apiClient.post('/api/subjects', {
          subject_id: Number(form.subject_id),
          course_id: Number(form.selected_course_id),
          subject_name: form.subject_name,
          hours_per_week: Number(form.hours_per_week),
          subject_hours: Number(form.subject_hours),
          type: form.subject_type
      });
      }
      navigate('/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to create ${itemType}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create {itemType === 'course' ? 'Course' : 'Subject'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemType} onValueChange={(value: 'course' | 'subject') => setItemType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemType === 'course' ? (
              <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course_id">Course ID</Label>
                <Input
                  id="course_id"
                  type="number"
                  value={form.course_id}
                  onChange={(e) => handleChange('course_id', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_name">Course Name</Label>
                <Input
                  id="course_name"
                  value={form.course_name}
                  onChange={(e) => handleChange('course_name', e.target.value)}
                  required
                />
              </div>
            </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject_id">Subject ID</Label>
                    <Input
                      id="subject_id"
                      type="number"
                      value={form.subject_id}
                      onChange={(e) => handleChange('subject_id', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject_name">Subject Name</Label>
                    <Input
                      id="subject_name"
                      value={form.subject_name}
                      onChange={(e) => handleChange('subject_name', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Subject Type</Label>
                    <Select value={form.subject_type} onValueChange={(value: 'Lab' | 'Theory' | 'Seminar') => handleChange('subject_type', value)}>
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
                </div>
              </>
            )}

            {itemType === 'course' && (
              <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  value={form.credits}
                  onChange={(e) => handleChange('credits', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={form.year} onValueChange={(value) => handleChange('year', value)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SY">Second Year (SY)</SelectItem>
                    <SelectItem value="TY">Third Year (TY)</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : `Save ${itemType === 'course' ? 'Course' : 'Subject'}`}
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



