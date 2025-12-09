import { create } from 'zustand';
import { Timetable, TimetableSlot, Conflict, WeekDay } from '@/types/domain';
import { generateId } from '@/lib/utils';

interface TimetableState {
  currentTimetable: Timetable | null;
  timetables: Timetable[];
  selectedSlot: TimetableSlot | null;
  conflicts: Conflict[];
  isGenerating: boolean;
  isDirty: boolean;
  history: Timetable[];
  historyIndex: number;
}

interface TimetableActions {
  // Timetable management
  setCurrentTimetable: (timetable: Timetable) => void;
  createTimetable: (name: string, year: number, semester: number) => void;
  updateTimetableName: (name: string) => void;
  deleteTimetable: (id: string) => void;
  
  // Slot management
  addSlot: (slot: Omit<TimetableSlot, 'id' | 'createdAt' | 'updatedAt' | 'conflicts'>) => void;
  updateSlot: (slotId: string, updates: Partial<TimetableSlot>) => void;
  deleteSlot: (slotId: string) => void;
  selectSlot: (slot: TimetableSlot | null) => void;
  
  // Conflict detection
  detectConflicts: () => void;
  resolveConflict: (conflictId: string) => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Generation
  generateTimetable: (constraints: any) => Promise<void>;
  
  // Utilities
  markDirty: () => void;
  markClean: () => void;
  clearSelection: () => void;
}

const createEmptyTimetable = (name: string, year: number, semester: number): Timetable => ({
  id: generateId(),
  name,
  year,
  semester,
  isActive: false,
  slots: [],
  generatedAt: new Date().toISOString(),
  generatedBy: '1', // Current user
  lastModified: new Date().toISOString(),
  version: 1
});

export const useTimetableStore = create<TimetableState & TimetableActions>((set, get) => ({
  currentTimetable: null,
  timetables: [],
  selectedSlot: null,
  conflicts: [],
  isGenerating: false,
  isDirty: false,
  history: [],
  historyIndex: -1,

  setCurrentTimetable: (timetable: Timetable) => {
    set({ 
      currentTimetable: timetable,
      selectedSlot: null,
      isDirty: false
    });
    get().detectConflicts();
    get().saveToHistory();
  },

  createTimetable: (name: string, year: number, semester: number) => {
    const newTimetable = createEmptyTimetable(name, year, semester);
    set(state => ({
      timetables: [...state.timetables, newTimetable],
      currentTimetable: newTimetable,
      isDirty: false,
      history: [newTimetable],
      historyIndex: 0
    }));
  },

  updateTimetableName: (name: string) => {
    const state = get();
    if (!state.currentTimetable) return;
    
    const updated = {
      ...state.currentTimetable,
      name,
      lastModified: new Date().toISOString()
    };
    
    set({
      currentTimetable: updated,
      timetables: state.timetables.map(t => 
        t.id === updated.id ? updated : t
      ),
      isDirty: true
    });
  },

  deleteTimetable: (id: string) => {
    set(state => ({
      timetables: state.timetables.filter(t => t.id !== id),
      currentTimetable: state.currentTimetable?.id === id ? null : state.currentTimetable
    }));
  },

  addSlot: (slotData) => {
    const state = get();
    if (!state.currentTimetable) return;

    const newSlot: TimetableSlot = {
      ...slotData,
      id: generateId(),
      conflicts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = {
      ...state.currentTimetable,
      slots: [...state.currentTimetable.slots, newSlot],
      lastModified: new Date().toISOString()
    };

    set({
      currentTimetable: updated,
      timetables: state.timetables.map(t => 
        t.id === updated.id ? updated : t
      ),
      isDirty: true
    });

    get().detectConflicts();
    get().saveToHistory();
  },

  updateSlot: (slotId: string, updates) => {
    const state = get();
    if (!state.currentTimetable) return;

    const updated = {
      ...state.currentTimetable,
      slots: state.currentTimetable.slots.map(slot =>
        slot.id === slotId 
          ? { ...slot, ...updates, updatedAt: new Date().toISOString() }
          : slot
      ),
      lastModified: new Date().toISOString()
    };

    set({
      currentTimetable: updated,
      timetables: state.timetables.map(t => 
        t.id === updated.id ? updated : t
      ),
      selectedSlot: state.selectedSlot?.id === slotId 
        ? { ...state.selectedSlot, ...updates } 
        : state.selectedSlot,
      isDirty: true
    });

    get().detectConflicts();
    get().saveToHistory();
  },

  deleteSlot: (slotId: string) => {
    const state = get();
    if (!state.currentTimetable) return;

    const updated = {
      ...state.currentTimetable,
      slots: state.currentTimetable.slots.filter(slot => slot.id !== slotId),
      lastModified: new Date().toISOString()
    };

    set({
      currentTimetable: updated,
      timetables: state.timetables.map(t => 
        t.id === updated.id ? updated : t
      ),
      selectedSlot: state.selectedSlot?.id === slotId ? null : state.selectedSlot,
      isDirty: true
    });

    get().detectConflicts();
    get().saveToHistory();
  },

  selectSlot: (slot: TimetableSlot | null) => {
    set({ selectedSlot: slot });
  },

  detectConflicts: () => {
    const state = get();
    if (!state.currentTimetable) {
      set({ conflicts: [] });
      return;
    }

    const conflicts: Conflict[] = [];
    const slots = state.currentTimetable.slots;

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slotA = slots[i];
        const slotB = slots[j];

        if (slotA.timeSlot.day !== slotB.timeSlot.day) continue;
        if (!hasTimeOverlap(slotA.timeSlot, slotB.timeSlot)) continue;

        const affectedSlots = [slotA.id, slotB.id];

        if (slotA.teacherId && slotA.teacherId === slotB.teacherId) {
          conflicts.push({
            id: generateId(),
            type: 'teacher_overlap',
            severity: 'error',
            message: `Teacher ${slotA.teacherId} has overlapping classes`,
            affectedSlots,
            affectedEntities: { teachers: [slotA.teacherId] },
            suggestions: ['Reschedule one of the classes', 'Assign another teacher'],
            isResolved: false
          });
        }

        if (slotA.roomId && slotA.roomId === slotB.roomId) {
          conflicts.push({
            id: generateId(),
            type: 'room_overlap',
            severity: 'error',
            message: `Room ${slotA.roomId} is double-booked`,
            affectedSlots,
            affectedEntities: { rooms: [slotA.roomId] },
            suggestions: ['Change the room for one class', 'Adjust schedule'],
            isResolved: false
          });
        }

        const sharedGroups = slotA.studentGroups.filter(group => slotB.studentGroups.includes(group));
        if (sharedGroups.length) {
          conflicts.push({
            id: generateId(),
            type: 'student_overlap',
            severity: 'warning',
            message: `Student groups ${sharedGroups.join(', ')} are double-booked`,
            affectedSlots,
            affectedEntities: { students: sharedGroups },
            suggestions: ['Split the groups', 'Reschedule one of the sessions'],
            isResolved: false
          });
        }
      }
    }

    set({ conflicts });
  },

  resolveConflict: (conflictId: string) => {
    set(state => ({
      conflicts: state.conflicts.map(conflict =>
        conflict.id === conflictId
          ? { ...conflict, isResolved: true, resolvedAt: new Date().toISOString() }
          : conflict
      )
    }));
  },

  saveToHistory: () => {
    const state = get();
    if (!state.currentTimetable) return;

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ ...state.currentTimetable });
    
    // Limit history to last 20 states
    if (newHistory.length > 20) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const previousState = state.history[state.historyIndex - 1];
      set({
        currentTimetable: previousState,
        historyIndex: state.historyIndex - 1,
        isDirty: true
      });
      get().detectConflicts();
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1];
      set({
        currentTimetable: nextState,
        historyIndex: state.historyIndex + 1,
        isDirty: true
      });
      get().detectConflicts();
    }
  },

  generateTimetable: async (constraints: any) => {
    set({ isGenerating: true });
    
    try {
      // Simulate timetable generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated slots
      const generatedSlots: TimetableSlot[] = [
        {
          id: generateId(),
          timeSlot: {
            id: generateId(),
            startTime: '09:00',
            endTime: '10:00',
            day: 'monday'
          },
          subjectId: 'math-101',
          teacherId: 'teacher-1',
          roomId: 'room-101',
          studentGroups: ['group-1'],
          isLocked: false,
          conflicts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        // Add more mock slots...
      ];

      const state = get();
      if (state.currentTimetable) {
        const updated = {
          ...state.currentTimetable,
          slots: generatedSlots,
          lastModified: new Date().toISOString(),
          version: state.currentTimetable.version + 1
        };

        set({
          currentTimetable: updated,
          timetables: state.timetables.map(t => 
            t.id === updated.id ? updated : t
          ),
          isDirty: true,
          isGenerating: false
        });

        get().detectConflicts();
        get().saveToHistory();
      }
    } catch (error) {
      set({ isGenerating: false });
    }
  },

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  clearSelection: () => set({ selectedSlot: null })
}));

// Helper function for time overlap detection
function hasTimeOverlap(
  slot1: { startTime: string; endTime: string },
  slot2: { startTime: string; endTime: string }
): boolean {
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  return start1 < end2 && start2 < end1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}