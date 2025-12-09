import { useTimetableStore } from '@/state/timetable';

export function WeekGrid() {
  const { currentTimetable } = useTimetableStore();

  return (
    <div className="timetable-grid">
      <div className="p-4 text-center text-muted-foreground">
        Timetable grid will be implemented here
      </div>
    </div>
  );
}