import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, X } from "lucide-react";

interface Elective {
    subject_id: number;
    subject_name: string;
}

interface RankingUIProps {
    selectedElectives: Elective[];
    onRemove: (id: number) => void;
    onReorder: (newOrder: Elective[]) => void;
    onSubmit: () => void;
    submitting: boolean;
}

export function RankingUI({ selectedElectives, onRemove, onReorder, onSubmit, submitting }: RankingUIProps) {

    // Simple move up/down helper since we don't have dnd-kit yet
    const move = (index: number, direction: 'up' | 'down') => {
        const newItems = [...selectedElectives];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newItems.length) {
            [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
            onReorder(newItems);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rank Your Choices</h3>
            <p className="text-sm text-muted-foreground">Priority is given to your top choices.</p>

            <div className="space-y-2">
                {selectedElectives.map((elective, index) => (
                    <Card key={elective.subject_id} className="relative">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => move(index, 'up')} disabled={index === 0}>▲</Button>
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => move(index, 'down')} disabled={index === selectedElectives.length - 1}>▼</Button>
                            </div>
                            <div className="flex-1 font-medium bg-secondary/20 p-2 rounded">
                                <span className="mr-2 font-bold text-primary">#{index + 1}</span>
                                {elective.subject_name}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onRemove(elective.subject_id)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
                {selectedElectives.length === 0 && (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg text-muted-foreground">
                        No electives selected. Choose from the catalog.
                    </div>
                )}
            </div>

            <Button className="w-full" onClick={onSubmit} disabled={submitting || selectedElectives.length === 0}>
                {submitting ? "Submitting..." : "Submit Choices"}
            </Button>
        </div>
    );
}
