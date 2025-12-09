import { Conflict } from '@/types/domain';

interface ConflictPanelProps {
  conflicts: Conflict[];
}

export function ConflictPanel({ conflicts }: ConflictPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {conflicts.length === 0 ? 'No conflicts detected' : `${conflicts.length} conflicts found`}
      </p>

      {conflicts.map(conflict => (
        <div
          key={conflict.id}
          className="rounded border border-border bg-card p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium capitalize">{conflict.type.replace('_', ' ')}</p>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                conflict.severity === 'error'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {conflict.severity}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{conflict.message}</p>
          {conflict.affectedEntities && (
            <div className="text-xs text-muted-foreground space-y-1">
              {conflict.affectedEntities.teachers && (
                <p>Teachers: {conflict.affectedEntities.teachers.join(', ')}</p>
              )}
              {conflict.affectedEntities.rooms && (
                <p>Rooms: {conflict.affectedEntities.rooms.join(', ')}</p>
              )}
              {conflict.affectedEntities.students && (
                <p>Student groups: {conflict.affectedEntities.students.join(', ')}</p>
              )}
            </div>
          )}
          {conflict.suggestions?.length ? (
            <ul className="text-xs text-muted-foreground list-disc pl-4">
              {conflict.suggestions.map((suggestion, index) => (
                <li key={`${conflict.id}-suggestion-${index}`}>{suggestion}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}