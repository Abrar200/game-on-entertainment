import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface ReportGeneratorPart2Props {
  venues: any[];
  selectedVenue: string;
  setSelectedVenue: (value: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (value: { start: string; end: string }) => void;
  generateVenueReport: () => void;
  loading: boolean;
}

const ReportGeneratorPart2: React.FC<ReportGeneratorPart2Props> = ({
  venues,
  selectedVenue,
  setSelectedVenue,
  dateRange,
  setDateRange,
  generateVenueReport,
  loading
}) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-red-700 font-semibold">Select Venue *</Label>
        <Select value={selectedVenue} onValueChange={setSelectedVenue}>
          <SelectTrigger className="border-red-200">
            <SelectValue placeholder="Choose a venue" />
          </SelectTrigger>
          <SelectContent>
            {venues.map(venue => (
              <SelectItem key={venue.id} value={venue.id}>
                {venue.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-red-700 font-semibold">Start Date *</Label>
          <Input 
            id="startDate"
            type="date" 
            value={dateRange.start} 
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="border-red-200 focus:border-red-500"
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate" className="text-red-700 font-semibold">End Date *</Label>
          <Input 
            id="endDate"
            type="date" 
            value={dateRange.end} 
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="border-red-200 focus:border-red-500"
            required
          />
        </div>
      </div>

      <Button 
        onClick={generateVenueReport}
        disabled={loading} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
      >
        <Building2 className="h-5 w-5 mr-2" />
        {loading ? 'Generating Venue Report...' : 'Generate Venue Report'}
      </Button>
    </div>
  );
};

export default ReportGeneratorPart2;