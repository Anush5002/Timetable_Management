import { z } from 'zod';
import { WeekDay, UserRole, CourseType } from '@/types/domain';

// Common validation schemas
export const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

export const weekDaySchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

export const userRoleSchema = z.enum(['admin', 'teacher', 'student', 'support_staff']);

export const courseTypeSchema = z.enum(['core', 'elective', 'lab', 'project', 'seminar']);

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: userRoleSchema.optional()
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: userRoleSchema,
  isActive: z.boolean().default(true)
});

export const teacherSchema = userSchema.extend({
  role: z.literal('teacher'),
  department: z.string().min(1, 'Department is required'),
  specialization: z.array(z.string()).min(1, 'At least one specialization is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  maxHoursPerWeek: z.number().min(1).max(60, 'Max hours per week must be between 1 and 60')
});

export const studentSchema = userSchema.extend({
  role: z.literal('student'),
  studentId: z.string().min(1, 'Student ID is required'),
  year: z.number().min(1).max(6, 'Year must be between 1 and 6'),
  semester: z.number().min(1).max(12, 'Semester must be between 1 and 12'),
  program: z.string().min(1, 'Program is required')
});

// Course validation schemas
export const subjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Subject name is required'),
  type: z.enum(['lecture', 'tutorial', 'lab', 'practical']),
  hoursPerWeek: z.number().min(1).max(20, 'Hours per week must be between 1 and 20'),
  duration: z.number().min(30).max(240, 'Duration must be between 30 and 240 minutes'),
  teacherId: z.string().optional(),
  maxStudents: z.number().min(1).optional(),
  isElective: z.boolean().default(false),
  equipmentRequired: z.array(z.string()).default([])
});

export const courseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Course code is required'),
  name: z.string().min(1, 'Course name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  credits: z.number().min(1).max(10, 'Credits must be between 1 and 10'),
  type: courseTypeSchema,
  year: z.number().min(1).max(6, 'Year must be between 1 and 6'),
  semester: z.number().min(1).max(12, 'Semester must be between 1 and 12'),
  maxStudents: z.number().min(1, 'Max students must be at least 1'),
  isActive: z.boolean().default(true),
  prerequisites: z.array(z.string()).default([]),
  corequisites: z.array(z.string()).default([]),
  subjects: z.array(subjectSchema).default([])
});

// Room validation schemas
export const equipmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Equipment name is required'),
  type: z.string().min(1, 'Equipment type is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  isWorking: z.boolean().default(true)
});

export const roomSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Room code is required'),
  name: z.string().min(1, 'Room name is required'),
  type: z.enum(['lab', 'lecture_hall', 'classroom', 'auditorium', 'computer_lab', 'conference_room']),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  location: z.string().min(1, 'Location is required'),
  floor: z.number().min(0, 'Floor must be 0 or greater'),
  building: z.string().min(1, 'Building is required'),
  isActive: z.boolean().default(true),
  equipment: z.array(equipmentSchema).default([]),
  features: z.array(z.string()).default([])
});

// Timetable validation schemas
export const timeSlotSchema = z.object({
  id: z.string().optional(),
  startTime: timeSchema,
  endTime: timeSchema,
  day: weekDaySchema
}).refine(data => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const timetableSlotSchema = z.object({
  id: z.string().optional(),
  timeSlot: timeSlotSchema,
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  studentGroups: z.array(z.string()).default([]),
  isLocked: z.boolean().default(false),
  notes: z.string().optional()
});

export const timetableSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Timetable name is required'),
  year: z.number().min(2020).max(2030, 'Year must be between 2020 and 2030'),
  semester: z.number().min(1).max(12, 'Semester must be between 1 and 12'),
  isActive: z.boolean().default(false),
  slots: z.array(timetableSlotSchema).default([])
});

// Availability validation schemas
export const timePreferenceSchema = z.object({
  day: weekDaySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  preference: z.enum(['preferred', 'available', 'unavailable']),
  priority: z.number().min(1).max(5, 'Priority must be between 1 and 5'),
  reason: z.string().optional()
}).refine(data => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const teacherAvailabilitySchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  preferences: z.array(timePreferenceSchema).default([]),
  maxConsecutiveHours: z.number().min(1).max(8, 'Max consecutive hours must be between 1 and 8'),
  preferredDaysOff: z.array(weekDaySchema).default([]),
  maxDaysPerWeek: z.number().min(1).max(7, 'Max days per week must be between 1 and 7')
});

// Settings validation schemas
export const institutionTimeSlotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Time slot name is required'),
  startTime: timeSchema,
  endTime: timeSchema,
  duration: z.number().min(30).max(240, 'Duration must be between 30 and 240 minutes'),
  type: z.enum(['regular', 'extended', 'short']),
  isActive: z.boolean().default(true)
}).refine(data => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start && (end - start) === data.duration;
}, {
  message: 'Duration must match the time difference',
  path: ['duration']
});

export const breakScheduleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Break name is required'),
  startTime: timeSchema,
  endTime: timeSchema,
  days: z.array(weekDaySchema).min(1, 'At least one day is required'),
  type: z.enum(['short_break', 'lunch_break', 'tea_break']),
  isFixed: z.boolean().default(true)
}).refine(data => {
  const start = timeToMinutes(data.startTime);
  const end = timeToMinutes(data.endTime);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const holidaySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Holiday name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['national', 'religious', 'institutional', 'local']),
  isRecurring: z.boolean().default(false),
  description: z.string().optional()
});

// Utility functions for validation
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Export validation functions
export function validateCourse(data: unknown) {
  return courseSchema.safeParse(data);
}

export function validateRoom(data: unknown) {
  return roomSchema.safeParse(data);
}

export function validateTeacher(data: unknown) {
  return teacherSchema.safeParse(data);
}

export function validateStudent(data: unknown) {
  return studentSchema.safeParse(data);
}

export function validateTimetable(data: unknown) {
  return timetableSchema.safeParse(data);
}

export function validateTimeSlot(data: unknown) {
  return timeSlotSchema.safeParse(data);
}

export function validateAvailability(data: unknown) {
  return teacherAvailabilitySchema.safeParse(data);
}