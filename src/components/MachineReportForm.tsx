import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Calculator } from 'lucide-react';
import MachineSelectInput from './MachineSelectInput';

const MachineReportForm: React.FC = () => {
  const { machines, refreshData } = useAppContext();
  const { toast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState('');
  const [tokensInGame, setTokensInGame] = useState('');
  const [moneyCollected, setMoneyCollected] = useState('');
  const [currentToyCount, setCurrentToyCount] = useState('');
  const [notes, setNotes] = useState('');
  const [previousToyCount, setPreviousToyCount] = useState<number | null>(null);
  const [calculatedToys, setCalculatedToys] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedMachine) {
      fetchLastToyCount(selectedMachine);
    }
  }, [selectedMachine]);

  useEffect(() => {
    if (currentToyCount && previousToyCount !== null) {
      const current = parseInt(currentToyCount);
      const diff = current - previousToyCount;
      setCalculatedToys(diff >= 0 ? diff : 0);
    } else {
      setCalculatedToys(null);
    }
  }, [currentToyCount, previousToyCount]);

  const fetchLastToyCount = async (machineId: string) => {
    try {
      // Try machine_reports first
      let { data, error } = await supabase
        .from('machine_reports')
        .select('current_toy_count')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1);

      // If no data from machine_reports, try reports table
      if (!data || data.length === 0) {
        const { data: reportsData, error: reportsError } = await supabase
          .from('reports')
          .select('toy_counter_reading')
          .eq('machine_id', machineId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!reportsError && reportsData && reportsData.length > 0) {
          setPreviousToyCount(reportsData[0].toy_counter_reading || 0);
          return;
        }
      }

      if (error) {
        console.warn('Error fetching last toy count:', error);
        setPreviousToyCount(0);
        return;
      }

      setPreviousToyCount(data && data.length > 0 ? (data[0].current_toy_count || 0) : 0);
    } catch (error) {
      console.error('Error fetching last toy count:', error);
      setPreviousToyCount(0);
    }
  };

  const calculatePrizeValue = (): number => {
    const toysDispensed = calculatedToys || 0;
    const machine = machines.find(m => m.id === selectedMachine);

    if (!machine?.current_prize || toysDispensed === 0) {
      return 0;
    }

    return toysDispensed * parseFloat(machine.current_prize.cost.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine || !moneyCollected || !currentToyCount) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please select a machine, enter money collected, and toy count',
        variant: 'destructive'
      });
      return;
    }

    const prizeValue = calculatePrizeValue();
    const toysDispensed = calculatedToys || 0;

    // Create report data with only the columns that exist
    const reportData = {
      machine_id: selectedMachine,
      money_collected: parseFloat(moneyCollected) || 0,
      current_toy_count: parseInt(currentToyCount) || 0,
      previous_toy_count: previousToyCount || 0,
      toys_dispensed: toysDispensed,
      prize_value: prizeValue,
      report_date: new Date().toISOString().split('T')[0]
    };

    // Add optional fields only if they have values
    if (tokensInGame) {
      (reportData as any).tokens_in_game = parseInt(tokensInGame);
    }

    if (notes.trim()) {
      (reportData as any).notes = notes.trim();
    }

    setLoading(true);
    try {
      console.log('Submitting report data:', reportData);

      const { data, error } = await supabase
        .from('machine_reports')
        .insert([reportData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Report created successfully:', data);

      // Also create entry in main reports table for better analytics
      try {
        const mainReportData = {
          machine_id: selectedMachine,
          venue_id: machines.find(m => m.id === selectedMachine)?.venue_id,
          revenue: parseFloat(moneyCollected) || 0,
          toy_counter_reading: parseInt(currentToyCount) || 0,
          toys_dispensed: toysDispensed,
          tokens_in_game: parseFloat(tokensInGame) || 0,
          commission_rate: machines.find(m => m.id === selectedMachine)?.venue?.commission_percentage || 30,
          commission_amount: (parseFloat(moneyCollected) || 0) * ((machines.find(m => m.id === selectedMachine)?.venue?.commission_percentage || 30) / 100),
          net_revenue: (parseFloat(moneyCollected) || 0) * (1 - ((machines.find(m => m.id === selectedMachine)?.venue?.commission_percentage || 30) / 100)),
          payout_percentage: moneyCollected ? (prizeValue / parseFloat(moneyCollected) * 100) : 0,
          report_date: new Date().toISOString().split('T')[0],
          notes: notes.trim() || null
        };

        await supabase.from('reports').insert([mainReportData]);
      } catch (mainReportError) {
        console.warn('Failed to create main report entry:', mainReportError);
        // Don't fail the whole operation if this fails
      }

      toast({
        title: 'Success',
        description: `Report created! Toys dispensed: ${toysDispensed}, Prize value: $${prizeValue.toFixed(2)}`
      });

      // Reset form
      setSelectedMachine('');
      setTokensInGame('');
      setMoneyCollected('');
      setCurrentToyCount('');
      setNotes('');
      setPreviousToyCount(null);
      setCalculatedToys(null);

      await refreshData();
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedMachineData = machines.find(m => m.id === selectedMachine);
  const prizeValue = calculatePrizeValue();
  const projectedPayout = moneyCollected && prizeValue > 0 ?
    ((prizeValue / parseFloat(moneyCollected)) * 100).toFixed(1) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Create Machine Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <MachineSelectInput
              value={selectedMachine}
              onChange={setSelectedMachine}
              label="Select Machine"
              required
            />
            {selectedMachineData?.current_prize && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">
                  Current Prize: {selectedMachineData.current_prize.name} (${selectedMachineData.current_prize.cost} each)
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-lg">Current Toy Counter Reading *</Label>
            <Input
              type="number"
              min="0"
              value={currentToyCount}
              onChange={(e) => setCurrentToyCount(e.target.value)}
              placeholder="Enter current toy counter number"
              className="text-lg font-semibold"
              required
            />
            {previousToyCount !== null && (
              <p className="text-sm text-gray-600">Previous reading: {previousToyCount}</p>
            )}
            {calculatedToys !== null && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">
                  🎁 Toys dispensed: {calculatedToys}
                </p>
                {prizeValue > 0 && (
                  <p className="text-sm font-semibold text-green-800">
                    💰 Prize value dispensed: ${prizeValue.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-lg">Money Collected ($) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={moneyCollected}
              onChange={(e) => setMoneyCollected(e.target.value)}
              placeholder="Enter amount collected"
              className="text-lg font-semibold"
              required
            />
            {projectedPayout && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800">
                  📊 Projected Payout %: {projectedPayout}%
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-lg">Tokens in Game</Label>
            <Input
              type="number"
              min="0"
              value={tokensInGame}
              onChange={(e) => setTokensInGame(e.target.value)}
              placeholder="Count tokens in machine (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional observations..."
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full text-lg py-4 bg-green-600 hover:bg-green-700">
            {loading ? 'Creating Report...' : '✅ Create Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MachineReportForm;