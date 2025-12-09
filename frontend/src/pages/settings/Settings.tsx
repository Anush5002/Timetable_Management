import { useEffect, useState } from 'react';
import { Save, Clock, Calendar, Bell, Shield, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const STORAGE_KEY = 'ttms-settings';
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    institution: {
      name: 'University of Excellence',
      address: '123 Education Street, Academic City',
      phone: '+1 (555) 123-4567',
      email: 'admin@university.edu'
    },
    academic: {
      yearStart: '2024-09-01',
      yearEnd: '2025-06-30',
      semesterLength: 16,
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      dayStart: '08:00',
      dayEnd: '18:00'
    },
    timetable: {
      slotDuration: 60,
      breakDuration: 15,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      maxConsecutiveHours: 3,
      allowBackToBack: true,
      autoConflictDetection: true
    },
    notifications: {
      emailNotifications: true,
      conflictAlerts: true,
      scheduleChanges: true,
      reminderDays: 3,
      digestFrequency: 'daily'
    }
  });

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast({
      title: 'Settings saved',
      description: 'Your configuration has been stored locally.'
    });
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          institution: { ...prev.institution, ...parsed.institution },
          academic: { ...prev.academic, ...parsed.academic },
          timetable: { ...prev.timetable, ...parsed.timetable },
          notifications: { ...prev.notifications, ...parsed.notifications }
        }));
      } catch (err) {
        console.warn('Failed to parse stored settings', err);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">
            Configure institution settings and system preferences
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="institution" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="institution">Institution</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="institution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Institution Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="institution-name">Institution Name</Label>
                  <Input
                    id="institution-name"
                    value={settings.institution.name}
                    onChange={(e) => updateSetting('institution', 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution-email">Email</Label>
                  <Input
                    id="institution-email"
                    type="email"
                    value={settings.institution.email}
                    onChange={(e) => updateSetting('institution', 'email', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="institution-address">Address</Label>
                <Textarea
                  id="institution-address"
                  value={settings.institution.address}
                  onChange={(e) => updateSetting('institution', 'address', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="institution-phone">Phone</Label>
                <Input
                  id="institution-phone"
                  value={settings.institution.phone}
                  onChange={(e) => updateSetting('institution', 'phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Academic Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year-start">Academic Year Start</Label>
                  <Input
                    id="year-start"
                    type="date"
                    value={settings.academic.yearStart}
                    onChange={(e) => updateSetting('academic', 'yearStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year-end">Academic Year End</Label>
                  <Input
                    id="year-end"
                    type="date"
                    value={settings.academic.yearEnd}
                    onChange={(e) => updateSetting('academic', 'yearEnd', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester-length">Semester Length (weeks)</Label>
                  <Input
                    id="semester-length"
                    type="number"
                    value={settings.academic.semesterLength}
                    onChange={(e) => updateSetting('academic', 'semesterLength', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <Badge
                      key={day}
                      variant={settings.academic.workingDays.includes(day) ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        const workingDays = settings.academic.workingDays.includes(day)
                          ? settings.academic.workingDays.filter(d => d !== day)
                          : [...settings.academic.workingDays, day];
                        updateSetting('academic', 'workingDays', workingDays);
                      }}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timetable Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day-start">Day Start Time</Label>
                  <Input
                    id="day-start"
                    type="time"
                    value={settings.academic.dayStart}
                    onChange={(e) => updateSetting('academic', 'dayStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day-end">Day End Time</Label>
                  <Input
                    id="day-end"
                    type="time"
                    value={settings.academic.dayEnd}
                    onChange={(e) => updateSetting('academic', 'dayEnd', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slot-duration">Slot Duration (minutes)</Label>
                  <Input
                    id="slot-duration"
                    type="number"
                    value={settings.timetable.slotDuration}
                    onChange={(e) => updateSetting('timetable', 'slotDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                  <Input
                    id="break-duration"
                    type="number"
                    value={settings.timetable.breakDuration}
                    onChange={(e) => updateSetting('timetable', 'breakDuration', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-consecutive">Max Consecutive Hours</Label>
                  <Input
                    id="max-consecutive"
                    type="number"
                    value={settings.timetable.maxConsecutiveHours}
                    onChange={(e) => updateSetting('timetable', 'maxConsecutiveHours', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-back-to-back">Allow Back-to-Back Classes</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow classes to be scheduled consecutively without breaks
                    </p>
                  </div>
                  <Switch
                    id="allow-back-to-back"
                    checked={settings.timetable.allowBackToBack}
                    onCheckedChange={(checked) => updateSetting('timetable', 'allowBackToBack', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-conflict">Auto Conflict Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and highlight scheduling conflicts
                    </p>
                  </div>
                  <Switch
                    id="auto-conflict"
                    checked={settings.timetable.autoConflictDetection}
                    onCheckedChange={(checked) => updateSetting('timetable', 'autoConflictDetection', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="conflict-alerts">Conflict Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when scheduling conflicts are detected
                    </p>
                  </div>
                  <Switch
                    id="conflict-alerts"
                    checked={settings.notifications.conflictAlerts}
                    onCheckedChange={(checked) => updateSetting('notifications', 'conflictAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="schedule-changes">Schedule Changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications for timetable modifications
                    </p>
                  </div>
                  <Switch
                    id="schedule-changes"
                    checked={settings.notifications.scheduleChanges}
                    onCheckedChange={(checked) => updateSetting('notifications', 'scheduleChanges', checked)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-days">Reminder Days</Label>
                  <Input
                    id="reminder-days"
                    type="number"
                    value={settings.notifications.reminderDays}
                    onChange={(e) => updateSetting('notifications', 'reminderDays', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-frequency">Digest Frequency</Label>
                  <Select
                    value={settings.notifications.digestFrequency}
                    onValueChange={(value) => updateSetting('notifications', 'digestFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Security settings and access controls will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}