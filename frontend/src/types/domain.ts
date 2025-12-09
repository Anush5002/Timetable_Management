// Domain types for the Time Tabling System

export type UserRole = 'admin' | 'teacher' | 'student' | 'support_staff';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type CourseType = 'core' | 'elective' | 'lab' | 'project' | 'seminar';

export type ConflictType = 'teacher_overlap' | 'student_overlap' | 'room_overlap' | 'capacity_exceeded' | 'equipment_missing' | 'time_violation';

export type ConflictSeverity = 'error' | 'warning' | 'info';

// User and Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher extends User {
  role: 'teacher';
  department: string;
  specialization: string[];
  employeeId: string;
  availability: TeacherAvailability;
  maxHoursPerWeek: number;
  vacationDays: VacationDay[];
}

export interface Student extends User {
  role: 'student';
  studentId: string;
  year: number;
  semester: number;
  program: string;
  enrolledCourses: string[]; // Course IDs
  electiveSelections: ElectiveSelection[];
}

export interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

export interface SupportStaff extends User {
  role: 'support_staff';
  department: string;
  responsibilities: string[];
}

// Courses and Subjects
export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  type: CourseType;
  year: number;
  semester: number;
  prerequisites: string[]; // Course IDs
  corequisites: string[]; // Course IDs
  maxStudents: number;
  isActive: boolean;
  subjects: Subject[];
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  courseId: string;
  name: string;
  type: 'lecture' | 'tutorial' | 'lab' | 'practical';
  hoursPerWeek: number;
  duration: number; // in minutes
  teacherId?: string;
  roomRequirements: RoomRequirement[];
  equipmentRequired: string[];
  maxStudents?: number;
  isElective: boolean;
}

export interface RoomRequirement {
  type: 'lab' | 'lecture_hall' | 'classroom' | 'auditorium' | 'computer_lab';
  minCapacity: number;
  features: string[];
}

// Rooms and Resources
export interface Room {
  id: string;
  code: string;
  name: string;
  type: 'lab' | 'lecture_hall' | 'classroom' | 'auditorium' | 'computer_lab' | 'conference_room';
  capacity: number;
  location: string;
  floor: number;
  building: string;
  equipment: Equipment[];
  features: string[];
  isActive: boolean;
  maintenanceSchedule: MaintenanceSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  quantity: number;
  isWorking: boolean;
  lastMaintenance?: string;
  nextMaintenance?: string;
}

export interface MaintenanceSchedule {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
  isRecurring: boolean;
  recurrencePattern?: string;
}

// Timetable and Scheduling
export interface TimeSlot {
  id: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  day: WeekDay;
  week?: number; // Optional for specific week numbering
}

export interface TimetableSlot {
  id: string;
  timeSlot: TimeSlot;
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  studentGroups: string[]; // Group IDs or course sections
  isLocked: boolean;
  notes?: string;
  conflicts: Conflict[];
  createdAt: string;
  updatedAt: string;
}

export interface Timetable {
  id: string;
  name: string;
  year: number;
  semester: number;
  isActive: boolean;
  slots: TimetableSlot[];
  generatedAt: string;
  generatedBy: string; // User ID
  lastModified: string;
  version: number;
}

// Conflicts and Validation
export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  affectedSlots: string[]; // TimetableSlot IDs
  affectedEntities: {
    teachers?: string[];
    students?: string[];
    rooms?: string[];
    subjects?: string[];
  };
  suggestions?: string[];
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

// Availability and Constraints
export interface TeacherAvailability {
  teacherId: string;
  preferences: TimePreference[];
  constraints: TimeConstraint[];
  maxConsecutiveHours: number;
  preferredDaysOff: WeekDay[];
  maxDaysPerWeek: number;
}

export interface TimePreference {
  day: WeekDay;
  startTime: string;
  endTime: string;
  preference: 'preferred' | 'available' | 'unavailable';
  priority: number; // 1-5, 5 being highest priority
  reason?: string;
}

export interface TimeConstraint {
  id: string;
  type: 'break' | 'meeting' | 'personal' | 'other';
  startTime: string;
  endTime: string;
  days: WeekDay[];
  isRecurring: boolean;
  description: string;
  isFlexible: boolean;
}

export interface VacationDay {
  id: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick_leave' | 'conference' | 'other';
  isApproved: boolean;
  reason?: string;
}

// Student Groups and Electives
export interface StudentGroup {
  id: string;
  name: string;
  year: number;
  semester: number;
  program: string;
  studentIds: string[];
  maxSize: number;
  type: 'regular' | 'elective' | 'lab_batch';
  parentGroupId?: string; // For sub-groups
}

export interface ElectiveSelection {
  id: string;
  studentId: string;
  subjectId: string;
  semester: number;
  year: number;
  priority: number; // In case of conflicts
  isConfirmed: boolean;
  selectedAt: string;
}

// Institution Settings
export interface InstitutionSettings {
  id: string;
  name: string;
  academicYear: AcademicYear;
  workingDays: WeekDay[];
  timeSlots: InstitutionTimeSlot[];
  breaks: BreakSchedule[];
  holidays: Holiday[];
  examPeriods: ExamPeriod[];
  preferences: TimetablePreferences;
  notifications: NotificationSettings;
  updatedAt: string;
  updatedBy: string;
}

export interface AcademicYear {
  startDate: string;
  endDate: string;
  semesters: Semester[];
}

export interface Semester {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface InstitutionTimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: 'regular' | 'extended' | 'short';
  isActive: boolean;
}

export interface BreakSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: WeekDay[];
  type: 'short_break' | 'lunch_break' | 'tea_break';
  isFixed: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'religious' | 'institutional' | 'local';
  isRecurring: boolean;
  description?: string;
}

export interface ExamPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'mid_semester' | 'end_semester' | 'quiz' | 'practical';
  affectedYears: number[];
  noRegularClasses: boolean;
}

export interface TimetablePreferences {
  allowBackToBackClasses: boolean;
  maxConsecutiveHours: number;
  preferredStartTime: string;
  preferredEndTime: string;
  distributionStrategy: 'even' | 'clustered' | 'flexible';
  prioritizeTeacherPreferences: boolean;
  allowSplitSubjects: boolean;
  maxDailyHours: number;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  conflictAlerts: boolean;
  scheduleChanges: boolean;
  reminderDays: number;
  notifyRoles: UserRole[];
}

// Reports and Analytics
export interface TimetableReport {
  id: string;
  type: 'utilization' | 'conflicts' | 'teacher_load' | 'room_usage' | 'student_schedule';
  generatedAt: string;
  generatedBy: string;
  filters: ReportFilters;
  data: any; // Report-specific data structure
  exportFormats: ('pdf' | 'excel' | 'csv')[];
}

export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  teachers?: string[];
  rooms?: string[];
  courses?: string[];
  departments?: string[];
  years?: number[];
  semesters?: number[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  message: string;
}

// Form and UI Types
export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Dashboard and Analytics
export interface DashboardStats {
  totalCourses: number;
  totalTeachers: number;
  totalStudents: number;
  totalRooms: number;
  utilizationRate: number;
  conflictsCount: number;
  upcomingClasses: number;
  recentChanges: number;
}

export interface UtilizationData {
  entity: string; // Room ID, Teacher ID, etc.
  entityName: string;
  entityType: 'room' | 'teacher' | 'course';
  totalHours: number;
  usedHours: number;
  utilizationPercentage: number;
  peakHours: string[];
}

export interface ConflictSummary {
  type: ConflictType;
  count: number;
  severity: ConflictSeverity;
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedEntities: number;
}