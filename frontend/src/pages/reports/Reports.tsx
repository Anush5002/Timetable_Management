import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, BarChart3, Calendar, Filter, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

Chart.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const reportTypes = [
  {
    id: 'utilization',
    name: 'Room Utilization Report',
    description: 'Analyze room usage patterns and efficiency',
    icon: BarChart3,
    category: 'Analytics',
    formats: ['PDF', 'Excel'],
    chartType: 'pie'
  },
  {
    id: 'teacher-load',
    name: 'Teacher Workload Report',
    description: 'Review teaching hours and distribution',
    icon: TrendingUp,
    category: 'Analytics',
    formats: ['PDF', 'Excel'],
    chartType: 'bar'
  },
  {
    id: 'student-schedule',
    name: 'Student Schedule Report',
    description: 'Individual and batch student timetables',
    icon: Calendar,
    category: 'Schedule',
    formats: ['PDF'],
    chartType: 'none'
  },
  {
    id: 'conflicts',
    name: 'Conflict Analysis Report',
    description: 'Detailed analysis of scheduling conflicts',
    icon: FileText,
    category: 'Analysis',
    formats: ['PDF', 'Excel'],
    chartType: 'bar'
  }
];

const recentReports = [
  {
    id: '1',
    name: 'Monthly Utilization - October 2024',
    type: 'Room Utilization',
    generatedAt: '2024-10-15T10:30:00Z',
    generatedBy: 'Mrs. Ranjana Jadhav',
    size: '2.4 MB',
    format: 'PDF'
  },
  {
    id: '2',
    name: 'Teacher Workload - Q3 2024',
    type: 'Teacher Workload',
    generatedAt: '2024-10-10T14:15:00Z',
    generatedBy: 'Admin User',
    size: '1.8 MB',
    format: 'Excel'
  },
  {
    id: '3',
    name: 'Conflict Analysis - Week 42',
    type: 'Conflict Analysis',
    generatedAt: '2024-10-08T09:00:00Z',
    generatedBy: 'Mrs. Aparna Sawant',
    size: '945 KB',
    format: 'PDF'
  }
];

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [roomSummary, setRoomSummary] = useState<{ label: string; value: number }[]>([]);
  const [teacherSummary, setTeacherSummary] = useState<{ label: string; value: number }[]>([]);
  const [conflictSummary, setConflictSummary] = useState<{ label: string; value: number }[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const categories = ['all', ...Array.from(new Set(reportTypes.map(r => r.category)))];

  const filteredReports = selectedCategory === 'all'
    ? reportTypes
    : reportTypes.filter(report => report.category === selectedCategory);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (sizeString: string) => {
    return sizeString;
  };

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoadingAnalytics(true);
        const [rooms, teachers, timetable] = await Promise.all([
          apiClient.get<any[]>('/api/rooms').catch(() => []),
          apiClient.get<any[]>('/api/teachers').catch(() => []),
          apiClient.get<any[]>('/api/timetable').catch(() => [])
        ]);

        const roomCounts = rooms.reduce<Record<string, number>>((acc, room) => {
          const type = room.type || 'Other';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        setRoomSummary(
          Object.entries(roomCounts).map(([label, value]) => ({ label, value }))
        );

        const teacherLoads = teachers.map((teacher) => ({
          label: teacher.name,
          value: estimateTeacherHours(teacher.availability)
        }));
        setTeacherSummary(teacherLoads);

        const conflicts = detectBackendConflicts(timetable || []);
        setConflictSummary(conflicts);
      } finally {
        setLoadingAnalytics(false);
      }
    }

    loadAnalytics();
  }, []);

  const roomChartData = useMemo(() => ({
    labels: roomSummary.map(item => item.label),
    datasets: [
      {
        label: 'Rooms',
        data: roomSummary.map(item => item.value),
        backgroundColor: ['#2563eb', '#22c55e', '#f97316', '#6366f1', '#f43f5e', '#0ea5e9']
      }
    ]
  }), [roomSummary]);

  const teacherChartData = useMemo(() => ({
    labels: teacherSummary.map(item => item.label),
    datasets: [
      {
        label: 'Scheduled Hours',
        data: teacherSummary.map(item => item.value),
        backgroundColor: '#2563eb'
      }
    ]
  }), [teacherSummary]);

  const conflictChartData = useMemo(() => ({
    labels: conflictSummary.map(item => item.label),
    datasets: [
      {
        label: 'Conflicts',
        data: conflictSummary.map(item => item.value),
        backgroundColor: '#f97316'
      }
    ]
  }), [conflictSummary]);

  const getChartDataForReport = (reportId: string) => {
    switch (reportId) {
      case 'utilization': return roomChartData;
      case 'teacher-load': return teacherChartData;
      case 'conflicts': return conflictChartData;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive reports
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline">
              Date Range
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                chartData={getChartDataForReport(report.id)}
                loading={loadingAnalytics}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Reports</h2>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          <div className="space-y-4">
            {recentReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{report.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{report.type}</Badge>
                        <Badge variant="secondary">{report.format}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatSize(report.size)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generated {formatDate(report.generatedAt)} by {report.generatedBy}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ReportCardProps {
  report: typeof reportTypes[0];
  chartData: any;
  loading: boolean;
}

function ReportCard({ report, chartData, loading }: ReportCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(report.formats[0]);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      if (selectedFormat === 'PDF' && contentRef.current) {
        // Create a temporary clone for capture to ensure it's visible or styled appropriately if needed
        // For now, capture exactly what's shown
        const canvas = await html2canvas(contentRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        // Add Header
        pdf.setFontSize(18);
        pdf.text(report.name, 40, 40);
        pdf.setFontSize(12);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 40, 60);

        // Add Image
        if (chartData) {
          const imgWidth = pdfWidth - 80;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 40, 80, imgWidth, imgHeight);
        } else {
          pdf.text("No visualization available for this report.", 40, 100);
        }

        pdf.save(`${report.id}-report.pdf`);
      } else if (selectedFormat === 'Excel') {
        // Simple Excel Mock - in real app would parse chartData
        const workbook = XLSX.utils.book_new();
        let data = [];
        if (chartData && chartData.labels) {
          data = chartData.labels.map((label: string, i: number) => ({
            Label: label,
            Value: chartData.datasets[0].data[i]
          }));
        } else {
          data = [{ status: 'No data available' }];
        }
        const sheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Report Data');
        XLSX.writeFile(workbook, `${report.id}-report.xlsx`);
      } else {
        // Fallback or Student Report (mock)
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Report generation simulation complete.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <report.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{report.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {report.description}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                {report.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analytics Visualization Embedded */}
        {loading ? (
          <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Loading data...</p>
          </div>
        ) : chartData ? (
          <div ref={contentRef} className="bg-card p-2 rounded-lg border border-border/50">
            <div className="h-64 w-full flex items-center justify-center">
              {report.chartType === 'pie' && <Pie data={chartData} options={{ maintainAspectRatio: false }} />}
              {report.chartType === 'bar' && <Bar data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
            </div>
          </div>
        ) : (
          <div ref={contentRef} className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground italic">Tabular data only</p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium">Export Format</label>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {report.formats.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || loading}
          className="w-full gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function estimateTeacherHours(availabilityInput: any): number {
  const availability = parseAvailabilityInput(availabilityInput);
  const minutes = Object.values(availability).reduce((total, slots) => {
    return (
      total +
      slots.reduce((innerTotal, slot) => {
        const [start, end] = slot.split('-');
        const diff = timeToMinutes(end) - timeToMinutes(start);
        return innerTotal + diff;
      }, 0)
    );
  }, 0);
  return Number((minutes / 60).toFixed(1));
}

function parseAvailabilityInput(value: any): Record<string, string[]> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function detectBackendConflicts(entries: any[]): { label: string; value: number }[] {
  const conflicts = {
    'Teacher overlap': 0,
    'Room overlap': 0,
    'Student overlap': 0
  };

  const normalizeEntry = (entry: any) => ({
    id: String(entry.schedule_id),
    day: entry.day_of_week,
    start: entry.start_time?.slice(0, 5) || '00:00',
    end: entry.end_time?.slice(0, 5) || '00:00',
    teacher: entry.teacher_id,
    room: entry.room_id,
    groups: Array.isArray(entry.student_group)
      ? entry.student_group
      : (() => {
        try {
          return JSON.parse(entry.student_group || '[]');
        } catch {
          return [];
        }
      })()
  });

  const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    return aStart < bEnd && aEnd > bStart;
  };

  const slots = entries.map(normalizeEntry);

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slotA = slots[i];
      const slotB = slots[j];
      if (slotA.day !== slotB.day) continue;
      if (!overlaps(slotA.start, slotA.end, slotB.start, slotB.end)) continue;

      if (slotA.teacher && slotA.teacher === slotB.teacher) {
        conflicts['Teacher overlap'] += 1;
      }
      if (slotA.room && slotA.room === slotB.room) {
        conflicts['Room overlap'] += 1;
      }
      const sharedGroups = slotA.groups.filter((group: string) => slotB.groups.includes(group));
      if (sharedGroups.length) {
        conflicts['Student overlap'] += 1;
      }
    }
  }

  return Object.entries(conflicts).map(([label, value]) => ({ label, value }));
}