import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function TimetableControls() {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" className="gap-2">
        <Plus className="h-3 w-3" />
        New Timetable
      </Button>
    </div>
  );
}