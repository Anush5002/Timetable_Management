import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';

type PersonType = 'teacher' | 'student' | 'support';

export default function NewPerson() {
  const availabilityExample = '{ "Monday": ["09:00-12:00","14:00-16:00"], "Tuesday": ["10:00-12:00"] }';
  const vacationExample = '["2025-01-01","2025-02-14"]';
  const coursesExample = '[1,2,3]';

  const navigate = useNavigate();
  const [personType, setPersonType] = useState<PersonType>('teacher');
  const [form, setForm] = useState({
    teacher_id: '',
    student_id: '',
    staff_id: '',
    name: '',
    max_hours_week: '',
    availability: availabilityExample,
    vacation_days: vacationExample,
    enrolled_courses: coursesExample,
    role: 'Technical Support' as 'Technical Support' | 'Non-technical Support',
    class_name: '',
    roll_number: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const parseObjectInput = (value: string, label: string) => {
    const trimmed = value.trim();
    if (!trimmed) return {};
    const candidates = [
      trimmed,
      trimmed.replace(/}\s*{/g, ',').replace(/,\s*"/g, ',"')
    ];
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // continue
      }
    }
    throw new Error(`${label} must be valid JSON. Example: {"Monday":["09:00-12:00"]}`);
  };

  const parseArrayInput = (value: string, label: string) => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const candidates = [trimmed];
    if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      candidates.push(`[${trimmed}]`);
    }
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // try next
      }
    }
    throw new Error(`${label} must be a JSON array. Example: ["2025-01-01","2025-02-14"]`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (personType === 'teacher') {
        const availability = parseObjectInput(form.availability, 'Availability');
        const vacationDays = parseArrayInput(form.vacation_days, 'Vacation days');
        await apiClient.post('/api/teachers', {
          teacher_id: Number(form.teacher_id),
          name: form.name,
          max_hours_week: Number(form.max_hours_week),
          availability,
          vacation_days: vacationDays
        });
      } else if (personType === 'student') {
        // const courses = parseArrayInput(form.enrolled_courses, 'Enrolled courses');
        await apiClient.post('/api/students', {
          student_id: Number(form.student_id),
          name: form.name,
          // enrolled_courses: courses, // Now handled by backend via class_name
          class_name: form.class_name,
          roll_number: form.roll_number
        });
      } else {
        await apiClient.post('/api/support-staff', {
          staff_id: Number(form.staff_id),
          name: form.name,
          role: form.role
        });
      }
      navigate('/people');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {personType === 'teacher' ? 'Add Teacher' :
              personType === 'student' ? 'Add Student' :
                'Add Support Staff'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Person Type</Label>
              <Select value={personType} onValueChange={(value: PersonType) => setPersonType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="support">Support Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personType === 'teacher' ? (
                <div className="space-y-2">
                  <Label htmlFor="teacher_id">Teacher ID</Label>
                  <Input
                    id="teacher_id"
                    type="number"
                    value={form.teacher_id}
                    onChange={(e) => handleChange('teacher_id', e.target.value)}
                    required
                  />
                </div>
              ) : personType === 'student' ? (
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID</Label>
                  <Input
                    id="student_id"
                    type="number"
                    value={form.student_id}
                    onChange={(e) => handleChange('student_id', e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="staff_id">Staff ID</Label>
                  <Input
                    id="staff_id"
                    type="number"
                    value={form.staff_id}
                    onChange={(e) => handleChange('staff_id', e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
            </div>

            {personType === 'teacher' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="max_hours_week">Max Hours / Week</Label>
                  <Input
                    id="max_hours_week"
                    type="number"
                    value={form.max_hours_week}
                    onChange={(e) => handleChange('max_hours_week', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability">Availability JSON</Label>
                  <Textarea
                    id="availability"
                    value={form.availability}
                    onChange={(e) => handleChange('availability', e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">Example: {availabilityExample}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vacation_days">Vacation Days JSON (array)</Label>
                  <Textarea
                    id="vacation_days"
                    value={form.vacation_days}
                    onChange={(e) => handleChange('vacation_days', e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Example: {vacationExample}</p>
                </div>
              </>
            )}

            {personType === 'student' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="class_name">Class Name</Label>
                  <Input
                    id="class_name"
                    value={form.class_name}
                    onChange={(e) => handleChange('class_name', e.target.value)}
                    placeholder="e.g. CS-FY-A"
                  />
                  <p className="text-xs text-muted-foreground">Enter a valid class name to automatically assign subjects.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roll_number">Roll Number</Label>
                  <Input
                    id="roll_number"
                    value={form.roll_number}
                    onChange={(e) => handleChange('roll_number', e.target.value)}
                    placeholder="e.g. 101"
                  />
                </div>
              </>
            )}

            {personType === 'support' && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(value: 'Technical Support' | 'Non-technical Support') => handleChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Non-technical Support">Non-technical Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
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

