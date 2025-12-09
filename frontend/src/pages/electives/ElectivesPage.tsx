import React, { useState } from 'react';
import { ElectivesCatalog } from './ElectivesCatalog';
import { RankingUI } from './RankingUI';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/state/auth';
import { useToast } from "@/hooks/use-toast";

export function ElectivesPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [selectedElectives, setSelectedElectives] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleSelect = (elective: any) => {
        if (selectedElectives.find(e => e.subject_id === elective.subject_id)) return;
        if (selectedElectives.length >= 3) {
            toast({ title: "Limit Reached", description: "You can only select up to 3 electives.", variant: "destructive" });
            return;
        }
        setSelectedElectives([...selectedElectives, elective]);
    };

    const handleRemove = (id: number) => {
        setSelectedElectives(selectedElectives.filter(e => e.subject_id !== id));
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const choices = selectedElectives.map((e, index) => ({
                elective_id: e.subject_id,
                rank: index + 1
            }));

            await apiClient.post('/electives/choose', {
                student_id: user.id, // Ensure user.id is mapped correctly in auth store
                choices
            });

            toast({ title: "Success", description: "Your elective choices have been submitted." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to submit choices.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Electives Registration</h1>
                <p className="text-muted-foreground">Select and rank your preferred electives for the upcoming semester.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold">Available Courses</h2>
                    <ElectivesCatalog onSelect={handleSelect} selectedIds={selectedElectives.map(e => e.subject_id)} />
                </div>
                <div>
                    <div className="sticky top-6">
                        <RankingUI
                            selectedElectives={selectedElectives}
                            onRemove={handleRemove}
                            onReorder={setSelectedElectives}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
