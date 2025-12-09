import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Building, Users, Wrench, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';

type Room = {
  room_id: number;
  room_name: string;
  capacity: number;
  equipment: unknown;
  type: 'Lecture' | 'Lab';
};

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'Lecture' | 'Lab'>('all');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [manageRoom, setManageRoom] = useState<Room | null>(null);
  const [manageForm, setManageForm] = useState({ capacity: '', equipment: '' });
  const [isManageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRooms() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.get<Room[]>('/api/rooms');
        if (!mounted) return;
        setRooms(data);
      } catch (err) {
        console.error('Failed to load rooms', err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load rooms');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRooms();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredRooms = useMemo(
    () =>
      rooms
        .filter(room =>
          room.room_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(room.room_id).includes(searchTerm)
        )
        .filter(room => (selectedTab === 'all' ? true : room.type === selectedTab)),
    [rooms, searchTerm, selectedTab]
  );

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Remove this room?')) return;
    try {
      await apiClient.delete(`/api/rooms/${roomId}`);
      setRooms(prev => prev.filter(room => room.room_id !== roomId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Room & Resource Management</h1>
          <p className="text-muted-foreground">
            Manage rooms, equipment, and track utilization
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/rooms/new')}>
          <Plus className="h-4 w-4" />
          Add Room
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as typeof selectedTab)}>
        <TabsList>
          <TabsTrigger value="all">All Rooms</TabsTrigger>
          <TabsTrigger value="Lecture">Lecture</TabsTrigger>
          <TabsTrigger value="Lab">Labs</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading && <RoomsSkeleton />}
            {!isLoading && filteredRooms.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  {error ? `Unable to load rooms: ${error}` : 'No rooms found'}
                </CardContent>
              </Card>
            )}
            {filteredRooms.map(room => (
              <RoomCard
                key={room.room_id}
                room={room}
                onDelete={() => handleDeleteRoom(room.room_id)}
                onManage={() => {
                  setManageRoom(room);
                  setManageForm({
                    capacity: String(room.capacity),
                    equipment: Array.isArray(room.equipment)
                      ? room.equipment.join(', ')
                      : typeof room.equipment === 'string'
                        ? room.equipment
                        : ''
                  });
                  setManageOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <ManageRoomDialog
        room={manageRoom}
        form={manageForm}
        open={isManageOpen}
        onOpenChange={setManageOpen}
        onChange={(field, value) => setManageForm(prev => ({ ...prev, [field]: value }))}
        onSave={async () => {
          if (!manageRoom) return;
          try {
            const equipmentList = manageForm.equipment
              ? manageForm.equipment.split(',').map(item => item.trim()).filter(Boolean)
              : [];
            await apiClient.patch(`/api/rooms/${manageRoom.room_id}`, {
              capacity: Number(manageForm.capacity),
              equipment: equipmentList
            });
            setRooms(prev =>
              prev.map(room =>
                room.room_id === manageRoom.room_id
                  ? { ...room, capacity: Number(manageForm.capacity), equipment: equipmentList }
                  : room
              )
            );
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update room');
          } finally {
            setManageOpen(false);
          }
        }}
      />
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  onDelete: () => void;
  onManage: () => void;
}

function RoomCard({ room, onDelete, onManage }: RoomCardProps) {
  const equipmentList = Array.isArray(room.equipment)
    ? room.equipment
    : typeof room.equipment === 'string'
      ? safeParse(room.equipment)
      : [];

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{room.room_name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">ID #{room.room_id}</Badge>
              <Badge variant="outline">{room.type}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Capacity: {room.capacity} seats</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{room.type === 'Lab' ? 'Lab ready' : 'Lecture ready'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Equipment</span>
            <span>{Array.isArray(equipmentList) ? equipmentList.length : 0} items</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.isArray(equipmentList) && equipmentList.length > 0
              ? equipmentList.slice(0, 4).map((item: any, idx: number) => (
                <Badge key={`${room.room_id}-${idx}`} variant="outline" className="text-xs">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </Badge>
              ))
              : <span className="text-xs text-muted-foreground">No equipment listed</span>}
            {Array.isArray(equipmentList) && equipmentList.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{equipmentList.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onManage}>
            <Wrench className="h-3 w-3" />
            Manage
          </Button>
          <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={onDelete}>
            <Trash className="h-3 w-3" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function ManageRoomDialog({
  room,
  form,
  open,
  onOpenChange,
  onChange,
  onSave
}: {
  room: Room | null;
  form: { capacity: string; equipment: string };
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onChange: (field: keyof typeof form, value: string) => void;
  onSave: () => Promise<void> | void;
}) {
  if (!room) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage {room.room_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCapacity">Capacity</Label>
            <Input
              id="roomCapacity"
              type="number"
              value={form.capacity}
              onChange={(e) => onChange('capacity', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomEquipment">Equipment (comma separated)</Label>
            <Textarea
              id="roomEquipment"
              value={form.equipment}
              onChange={(e) => onChange('equipment', e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-5/6" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
