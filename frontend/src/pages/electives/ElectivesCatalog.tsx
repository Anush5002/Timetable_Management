import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiClient } from "@/lib/api";
import { Loader2, Plus, Check } from "lucide-react";

interface Elective {
    subject_id: number;
    subject_name: string;
    hours_per_week: number;
    max_seats: number;
    lab_required: boolean;
    elective_group: string;
}

interface ElectivesCatalogProps {
    onSelect: (elective: Elective) => void;
    selectedIds: number[];
}

export function ElectivesCatalog({ onSelect, selectedIds }: ElectivesCatalogProps) {
    const [electives, setElectives] = useState<Elective[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchElectives();
    }, []);

    const fetchElectives = async () => {
        try {
            const data = await apiClient.get<Elective[]>('/electives');
            setElectives(data);
        } catch (error) {
            console.error("Failed to fetch electives", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {electives.map((elective) => {
                const isSelected = selectedIds.includes(elective.subject_id);
                return (
                    <Card key={elective.subject_id} className={`transition-all hover:shadow-md ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{elective.subject_name}</CardTitle>
                                    <CardDescription>{elective.elective_group || 'General Elective'}</CardDescription>
                                </div>
                                {elective.lab_required && <Badge variant="secondary">Lab Required</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-sm text-muted-foreground">
                                    {elective.hours_per_week}h / week • {elective.max_seats} seats
                                </div>
                                <Button
                                    size="sm"
                                    variant={isSelected ? "secondary" : "default"}
                                    onClick={() => onSelect(elective)}
                                    disabled={isSelected} // Or allow toggle if needed
                                >
                                    {isSelected ? <><Check className="mr-1 h-4 w-4" /> Selected</> : <><Plus className="mr-1 h-4 w-4" /> Select</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
