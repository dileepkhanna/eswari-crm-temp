import { useState } from 'react';
import { ProjectAvailability, ProjectFloor, ProjectFlat } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusIcon, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvailabilityFormProps {
  value?: ProjectAvailability;
  onChange: (availability: ProjectAvailability) => void;
}

export default function AvailabilityForm({ value, onChange }: AvailabilityFormProps) {
  const [floors, setFloors] = useState<ProjectFloor[]>(value?.floors || []);
  const [currentFloor, setCurrentFloor] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [facing, setFacing] = useState('');
  const [bhk, setBhk] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'available' | 'sold' | 'blocked'>('available');
  const [price, setPrice] = useState('');

  const calculateSummary = (floorsList: ProjectFloor[]) => {
    const allFlats = floorsList.flatMap(f => f.flats);
    return {
      totalFlats: allFlats.length,
      available: allFlats.filter(f => f.status === 'available').length,
      sold: allFlats.filter(f => f.status === 'sold').length,
      blocked: allFlats.filter(f => f.status === 'blocked').length,
    };
  };

  const addFlat = () => {
    if (!currentFloor || !flatNumber || !facing || !bhk || !area) {
      toast.error('Please fill in all required fields');
      return;
    }

    const floorNum = parseInt(currentFloor);
    const newFlat: ProjectFlat = {
      flatNumber,
      facing,
      bhk,
      area: parseFloat(area),
      status,
      price: price ? parseFloat(price) : undefined,
    };

    const updatedFloors = [...floors];
    const existingFloorIndex = updatedFloors.findIndex(f => f.floor === floorNum);

    if (existingFloorIndex >= 0) {
      // Check for duplicate flat number on same floor
      const duplicateFlat = updatedFloors[existingFloorIndex].flats.find(
        f => f.flatNumber === flatNumber
      );
      if (duplicateFlat) {
        toast.error(`Flat ${flatNumber} already exists on floor ${floorNum}`);
        return;
      }
      updatedFloors[existingFloorIndex].flats.push(newFlat);
    } else {
      updatedFloors.push({
        floor: floorNum,
        flats: [newFlat],
      });
    }

    // Sort floors by floor number
    updatedFloors.sort((a, b) => a.floor - b.floor);

    setFloors(updatedFloors);
    const availability: ProjectAvailability = {
      floors: updatedFloors,
      summary: calculateSummary(updatedFloors),
    };
    onChange(availability);

    // Reset form
    setFlatNumber('');
    setFacing('');
    setBhk('');
    setArea('');
    setStatus('available');
    setPrice('');
    toast.success('Flat added successfully');
  };

  const removeFlat = (floorNum: number, flatNumber: string) => {
    const updatedFloors = floors
      .map(floor => {
        if (floor.floor === floorNum) {
          return {
            ...floor,
            flats: floor.flats.filter(f => f.flatNumber !== flatNumber),
          };
        }
        return floor;
      })
      .filter(floor => floor.flats.length > 0);

    setFloors(updatedFloors);
    const availability: ProjectAvailability = {
      floors: updatedFloors,
      summary: calculateSummary(updatedFloors),
    };
    onChange(availability);
    toast.success('Flat removed');
  };

  const summary = calculateSummary(floors);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {floors.length > 0 && (
        <div className="grid grid-cols-4 gap-3 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.totalFlats}</div>
            <div className="text-xs text-muted-foreground">Total Flats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.available}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.sold}</div>
            <div className="text-xs text-muted-foreground">Sold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.blocked}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
        </div>
      )}

      {/* Add Flat Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Add Flat</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="floor">Floor Number *</Label>
            <input
              id="floor"
              type="number"
              placeholder="e.g., 1"
              value={currentFloor}
              onChange={(e) => setCurrentFloor(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flatNumber">Flat Number *</Label>
            <input
              id="flatNumber"
              type="text"
              placeholder="e.g., 101"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facing">Facing *</Label>
            <Select value={facing} onValueChange={setFacing}>
              <SelectTrigger>
                <SelectValue placeholder="Select facing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="North">North</SelectItem>
                <SelectItem value="South">South</SelectItem>
                <SelectItem value="East">East</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="North-East">North-East</SelectItem>
                <SelectItem value="North-West">North-West</SelectItem>
                <SelectItem value="South-East">South-East</SelectItem>
                <SelectItem value="South-West">South-West</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bhk">BHK *</Label>
            <Select value={bhk} onValueChange={setBhk}>
              <SelectTrigger>
                <SelectValue placeholder="Select BHK" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1BHK">1 BHK</SelectItem>
                <SelectItem value="2BHK">2 BHK</SelectItem>
                <SelectItem value="3BHK">3 BHK</SelectItem>
                <SelectItem value="4BHK">4 BHK</SelectItem>
                <SelectItem value="5BHK">5 BHK</SelectItem>
                <SelectItem value="Penthouse">Penthouse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Area (sq.ft) *</Label>
            <input
              id="area"
              type="number"
              placeholder="e.g., 1200"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="price">Price (₹)</Label>
            <input
              id="price"
              type="number"
              placeholder="e.g., 5000000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={addFlat} className="w-full">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Flat
            </Button>
          </div>
        </div>
      </div>

      {/* Flats List */}
      {floors.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Added Flats</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {floors.map((floor) => (
              <div key={floor.floor} className="border rounded-lg p-3">
                <div className="font-medium text-sm mb-2 flex items-center justify-between">
                  <span>Floor {floor.floor}</span>
                  <Badge variant="outline">{floor.flats.length} flats</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {floor.flats.map((flat, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border text-xs ${
                        flat.status === 'available'
                          ? 'bg-green-50 border-green-200'
                          : flat.status === 'sold'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{flat.flatNumber}</div>
                          <div className="text-muted-foreground">
                            {flat.bhk} | {flat.facing}
                          </div>
                          <div className="text-muted-foreground">{flat.area} sq.ft</div>
                          {flat.price && (
                            <div className="font-medium">₹{(flat.price / 100000).toFixed(2)}L</div>
                          )}
                          <Badge
                            variant={
                              flat.status === 'available'
                                ? 'default'
                                : flat.status === 'sold'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="mt-1 text-xs"
                          >
                            {flat.status}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeFlat(floor.floor, flat.flatNumber)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
