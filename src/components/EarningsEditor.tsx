import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface EarningsEditorProps {
  machineId: string;
  currentEarnings: number;
  onEarningsUpdated: () => void;
}

const EarningsEditor: React.FC<EarningsEditorProps> = ({ 
  machineId, 
  currentEarnings, 
  onEarningsUpdated 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [earnings, setEarnings] = useState(currentEarnings.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const earningsValue = parseFloat(earnings);
    if (isNaN(earningsValue) || earningsValue < 0) {
      toast({ 
        title: 'Error', 
        description: 'Please enter a valid earnings amount', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('machines')
        .update({ earnings: earningsValue })
        .eq('id', machineId);
      
      if (error) throw error;
      
      setIsOpen(false);
      onEarningsUpdated();
      toast({ 
        title: 'Success', 
        description: 'Machine earnings updated successfully' 
      });
    } catch (error) {
      console.error('Error updating earnings:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update earnings', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="border-blue-300 text-blue-600 hover:bg-blue-50"
        >
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-800">Update Machine Earnings</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-red-700 font-medium">Total Earnings ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={earnings}
              onChange={(e) => setEarnings(e.target.value)}
              placeholder="Enter total earnings"
              className="border-red-300 focus:border-red-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EarningsEditor;