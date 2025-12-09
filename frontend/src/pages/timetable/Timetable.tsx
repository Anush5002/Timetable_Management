import { useEffect, useState } from 'react';
import { Calendar, Plus, Settings, Download, Undo, Redo, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTimetableStore } from '@/state/timetable';
import { ConflictPanel } from '@/components/timetable/ConflictPanel';
import { TimetableControls } from '@/components/timetable/TimetableControls';
import { apiClient } from '@/lib/api';
import { TimetableSlot, WeekDay } from '@/types/domain';
import { useAuthStore } from '@/state/auth';

export default function Timetable() {
  const {
    currentTimetable,
    conflicts,
    isGenerating,
    isDirty,
    history,
    historyIndex,
    undo,
    redo,
    setCurrentTimetable
  } = useTimetableStore();

  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState('editor');
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [generatedTimetable, setGeneratedTimetable] = useState<any[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const saveTimetable = async (dataToSave: any[]) => {
    if (!dataToSave.length) return;

    // Chunk the data to avoid "Request Entity Too Large"
    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < dataToSave.length; i += CHUNK_SIZE) {
      chunks.push(dataToSave.slice(i, i + CHUNK_SIZE));
    }

    let savedCount = 0;
    for (const chunk of chunks) {
      await apiClient.post('/api/timetable/bulk', { entries: chunk });
      savedCount += chunk.length;
    }

    return savedCount;
  };

  const handleGenerateAI = async () => {
    try {
      setIsGeneratingAI(true);
      const data = await apiClient.post<any[]>('/api/generate-timetable', {});
      setGeneratedTimetable(data);

      // Auto-save/Publish immediately
      if (data.length > 0) {
        // Clear existing timetable first to prevent duplicates
        await apiClient.delete('/api/timetable');

        const count = await saveTimetable(data);
        alert(`Timetable generated and published successfully! (${count} entries saved). It is now visible to all users.`);

        // Refresh and switch to editor
        const refreshedData = await apiClient.get<any[]>('/api/timetable');
        setEntries(refreshedData);
        setSelectedTab('editor');
      }
    } catch (err) {
      alert('Failed to generate timetable: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleClearTimetable = async () => {
    if (!confirm('Are you sure you want to clear the entire timetable? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete('/api/timetable');
      setEntries([]);
      setGeneratedTimetable([]);

      // Clear store state to remove conflicts
      if (currentTimetable) {
        setCurrentTimetable({
          ...currentTimetable,
          slots: [],
          lastModified: new Date().toISOString()
        });
      }

      alert('Timetable cleared successfully.');
    } catch (err) {
      alert('Failed to clear timetable: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const activeConflicts = conflicts.filter(c => !c.isResolved);
  const errorConflicts = activeConflicts.filter(c => c.severity === 'error');
  const warningConflicts = activeConflicts.filter(c => c.severity === 'warning');

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Map frontend role to backend role
  const getBackendRole = (role: string): string => {
    if (role === 'admin') return 'Admin';
    if (role === 'teacher') return 'Teacher';
    if (role === 'student') return 'Student';
    return 'Admin';
  };

  useEffect(() => {
    let mounted = true;

    async function loadTimetable() {
      try {
        setEntriesLoading(true);
        const params: any = {};
        if (user) {
          params.user_id = user.id;
          params.role = getBackendRole(user.role);
        }
        const data = await apiClient.get<any[]>('/api/timetable', { params });
        if (!mounted) return;
        setEntries(data);

        if (data.length) {
          const slots: TimetableSlot[] = data.map(mapBackendEntryToSlot);
          const setCurrentTimetable = useTimetableStore.getState().setCurrentTimetable;
          setCurrentTimetable({
            id: 'backend-timetable',
            name: 'Backend Timetable',
            year: 1,
            semester: 1,
            isActive: true,
            slots,
            generatedAt: new Date().toISOString(),
            generatedBy: 'system',
            lastModified: new Date().toISOString(),
            version: 1
          });
        }
      } catch (error) {
        if (!mounted) return;
        setEntriesError(error instanceof Error ? error.message : 'Failed to load timetable');
      } finally {
        if (mounted) {
          setEntriesLoading(false);
        }
      }
    }

    loadTimetable();

    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {user?.role === 'student' ? 'Student Portal' : 'Timetable Management'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'student'
              ? `Welcome back, ${user.name}`
              : 'Create and manage class schedules with conflict detection'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="gap-1">
              Unsaved changes
            </Badge>
          )}
          {user?.role === 'admin' && activeConflicts.length > 0 && (
            <Badge variant={errorConflicts.length > 0 ? "destructive" : "secondary"} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {activeConflicts.length} conflicts
            </Badge>
          )}
        </div>
      </div>

      {/* Conflict Alert */}
      {user?.role === 'admin' && errorConflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            There are {errorConflicts.length} critical conflicts that need to be resolved.
            {warningConflicts.length > 0 && ` Additionally, ${warningConflicts.length} warnings were detected.`}
          </AlertDescription>
        </Alert>
      )}

      {user?.role === 'student' ? (
        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{entries.length}</div>
                      <p className="text-xs text-muted-foreground">Scheduled for this week</p>
                    </CardContent>
                  </Card>
                  {/* Add more dashboard widgets as needed */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timetable">
            <StudentTimetableGrid entries={entries} loading={entriesLoading} error={entriesError} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-4">
              {user?.role !== 'teacher' && <TimetableControls />}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="gap-1"
              >
                <Undo className="h-3 w-3" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="gap-1"
              >
                <Redo className="h-3 w-3" />
                Redo
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-3 w-3" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-3 w-3" />
                Settings
              </Button>
            </div>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="editor">Timetable Editor</TabsTrigger>
              {user?.role !== 'teacher' && (
                <>
                  <TabsTrigger value="conflicts">
                    Conflicts
                    {activeConflicts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeConflicts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="generator">Auto Generator</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="editor" className="space-y-6">
              {currentTimetable ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{currentTimetable.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Year {currentTimetable.year}, Semester {currentTimetable.semester}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={currentTimetable.isActive ? "default" : "secondary"}>
                        {currentTimetable.isActive ? "Active" : "Draft"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        v{currentTimetable.version}
                      </span>
                      {user?.role === 'admin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleClearTimetable}
                          className="gap-2 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear Timetable
                        </Button>
                      )}
                    </div>
                  </div>

                  <SimpleTimetable entries={entries} loading={entriesLoading} error={entriesError} />

                  {user?.role === 'admin' && activeConflicts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Conflicts detected ({activeConflicts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {activeConflicts.map(conflict => (
                          <div key={conflict.id} className="rounded border border-border p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium capitalize">{conflict.type.replace('_', ' ')}</p>
                              <Badge variant={conflict.severity === 'error' ? 'destructive' : 'secondary'}>
                                {conflict.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{conflict.message}</p>
                            {conflict.suggestions?.length ? (
                              <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                {conflict.suggestions.map((suggestion, index) => (
                                  <li key={`${conflict.id}-suggestion-${index}`}>{suggestion}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                      <h3 className="font-medium">No Timetable Selected</h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.role === 'teacher'
                          ? "No timetable entries found for your account."
                          : "Create a new timetable or select an existing one to start editing"}
                      </p>
                    </div>
                    {user?.role !== 'teacher' && (
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Timetable
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-4">
              <ConflictPanel conflicts={activeConflicts} />
            </TabsContent>

            <TabsContent value="generator" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Automatic Timetable Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Generate a timetable automatically based on courses, teacher availability, and room constraints.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        disabled={isGeneratingAI}
                        className="gap-2"
                        onClick={handleGenerateAI}
                      >
                        {isGeneratingAI && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
                        {isGeneratingAI ? 'Generating...' : 'Generate Timetable'}
                      </Button>

                    </div>

                    {generatedTimetable.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Generated Schedule</h3>
                        <SimpleTimetable entries={generatedTimetable} loading={false} error={null} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function StudentTimetableGrid({
  entries,
  loading,
  error
}: {
  entries: any[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading timetable...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!entries.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">No classes scheduled.</CardContent>
      </Card>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Group by day
  const grouped = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const day = entry.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});

  // Sort entries by time within each day
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 px-4 text-left font-medium w-32 bg-muted/50">Day</th>
              <th className="py-4 px-4 text-left font-medium bg-muted/50">Schedule</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const dayClasses = grouped[day] || [];
              return (
                <tr key={day} className="border-b border-border last:border-0">
                  <td className="py-4 px-4 font-medium bg-muted/20">{day}</td>
                  <td className="py-4 px-4">
                    {dayClasses.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {dayClasses.map((cls) => (
                          <div
                            key={cls.schedule_id}
                            className="flex-shrink-0 min-w-[200px] p-3 rounded-md bg-accent/50 border border-border"
                          >
                            <div className="font-semibold text-primary mb-1">
                              {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                            </div>
                            <div className="font-medium">{cls.subject_name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {cls.room_name} • {cls.teacher_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No classes</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SimpleTimetable({
  entries,
  loading,
  error
}: {
  entries: any[];
  loading: boolean;
  error: string | null;
}) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading timetable entries…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!entries.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">No timetable entries found.</CardContent>
      </Card>
    );
  }

  const grouped = entries.reduce<Record<string, any[]>>((acc, entry) => {
    const day = entry.day_of_week || 'Unassigned';
    acc[day] = acc[day] || [];
    acc[day].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([day, slots]) => (
        <Card key={day}>
          <CardHeader>
            <CardTitle className="text-base">{day}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Time</th>
                  {(isAdmin || isTeacher) && <th className="py-2 pr-4">Year</th>}
                  <th className="py-2 pr-4">Course</th>
                  <th className="py-2 pr-4">Subject</th>
                  {isAdmin && <th className="py-2 pr-4">Teacher</th>}
                  <th className="py-2 pr-4">Room</th>
                  <th className="py-2 pr-4">Class</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.schedule_id} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">
                      {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                    </td>
                    {(isAdmin || isTeacher) && (
                      <td className="py-2 pr-4">{slot.course_year || '-'}</td>
                    )}
                    <td className="py-2 pr-4">{slot.course_name || slot.course_id}</td>
                    <td className="py-2 pr-4">{slot.subject_name || slot.subject_id}</td>
                    {isAdmin && (
                      <td className="py-2 pr-4">{slot.teacher_name || slot.teacher_id}</td>
                    )}
                    <td className="py-2 pr-4">{slot.room_name || slot.room_id}</td>
                    <td className="py-2 pr-4">
                      {slot.class_name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function tryParseArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapBackendEntryToSlot(entry: any): TimetableSlot {
  return {
    id: `slot-${entry.schedule_id}`,
    timeSlot: {
      id: `time-${entry.schedule_id}`,
      startTime: entry.start_time?.slice(0, 5) || '00:00',
      endTime: entry.end_time?.slice(0, 5) || '00:00',
      day: normalizeDay(entry.day_of_week)
    },
    subjectId: entry.subject_id ? String(entry.subject_id) : undefined,
    teacherId: entry.teacher_id ? String(entry.teacher_id) : undefined,
    roomId: entry.room_id ? String(entry.room_id) : undefined,
    studentGroups: tryParseArray(entry.student_group),
    isLocked: true,
    notes: '',
    conflicts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeDay(day: string): WeekDay {
  const normalized = (day || 'monday').toLowerCase();
  const allowed: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return allowed.includes(normalized as WeekDay) ? (normalized as WeekDay) : 'monday';
}