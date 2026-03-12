import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Calculator, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
      let { data, error } = await supabase
        .from('machine_reports')
        .select('current_toy_count')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1);

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
    if (!machine?.current_prize || toysDispensed === 0) return 0;
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

    const reportData = {
      machine_id: selectedMachine,
      money_collected: parseFloat(moneyCollected) || 0,
      current_toy_count: parseInt(currentToyCount) || 0,
      previous_toy_count: previousToyCount || 0,
      toys_dispensed: toysDispensed,
      prize_value: prizeValue,
      report_date: new Date().toISOString().split('T')[0]
    };

    if (tokensInGame) {
      (reportData as any).tokens_in_game = parseInt(tokensInGame);
    }
    if (notes.trim()) {
      (reportData as any).notes = notes.trim();
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('machine_reports')
        .insert([reportData])
        .select();

      if (error) throw new Error(`Database error: ${error.message}`);

      try {
        const machine = machines.find(m => m.id === selectedMachine);
        const mainReportData = {
          machine_id: selectedMachine,
          venue_id: machine?.venue_id,
          revenue: parseFloat(moneyCollected) || 0,
          toy_counter_reading: parseInt(currentToyCount) || 0,
          toys_dispensed: toysDispensed,
          tokens_in_game: parseFloat(tokensInGame) || 0,
          commission_rate: machine?.venue?.commission_percentage || 30,
          commission_amount: (parseFloat(moneyCollected) || 0) * ((machine?.venue?.commission_percentage || 30) / 100),
          net_revenue: (parseFloat(moneyCollected) || 0) * (1 - ((machine?.venue?.commission_percentage || 30) / 100)),
          payout_percentage: moneyCollected ? (prizeValue / parseFloat(moneyCollected) * 100) : 0,
          report_date: new Date().toISOString().split('T')[0],
          notes: notes.trim() || null
        };
        await supabase.from('reports').insert([mainReportData]);
      } catch (mainReportError) {
        console.warn('Failed to create main report entry:', mainReportError);
      }

      toast({
        title: 'Report Created',
        description: `Toys dispensed: ${toysDispensed}, Prize value: $${prizeValue.toFixed(2)}`
      });

      setSelectedMachine('');
      setTokensInGame('');
      setMoneyCollected('');
      setCurrentToyCount('');
      setNotes('');
      setPreviousToyCount(null);
      setCalculatedToys(null);

      await refreshData();
    } catch (error: any) {
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
  const money = parseFloat(moneyCollected) || 0;

  // Payout % = prize value / money collected × 100
  const payoutPct = money > 0 && prizeValue > 0 ? (prizeValue / money) * 100 : null;

  // COGS = prize cost per unit × toys dispensed (same as prizeValue)
  const cogs = prizeValue;

  // Determine payout health
  const getPayoutStatus = (pct: number) => {
    if (pct < 10) return { label: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingDown };
    if (pct <= 30) return { label: 'Good', color: 'bg-green-100 text-green-700 border-green-200', icon: TrendingUp };
    return { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', icon: TrendingUp };
  };

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
          {/* Machine Selection */}
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

          {/* Toy Counter */}
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
              </div>
            )}
          </div>

          {/* Money Collected */}
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
          </div>

          {/* Payout % and COGS summary box — shown as soon as we have enough data */}
          {money > 0 && calculatedToys !== null && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Report Summary</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {/* Payout % */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Payout %</p>
                  {payoutPct !== null ? (
                    <>
                      <p className="text-2xl font-bold text-gray-900">{payoutPct.toFixed(1)}%</p>
                      <div className="mt-1">
                        {(() => {
                          const status = getPayoutStatus(payoutPct);
                          const Icon = status.icon;
                          return (
                            <Badge className={`text-xs ${status.color} border`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {status.label} · Target: 10–30%
                            </Badge>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">No prize data</p>
                  )}
                </div>

                {/* COGS */}
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-1">COGS (Prize Cost)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${cogs > 0 ? cogs.toFixed(2) : '0.00'}
                  </p>
                  {cogs > 0 && money > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {((cogs / money) * 100).toFixed(1)}% of revenue
                    </p>
                  )}
                  {cogs === 0 && calculatedToys > 0 && (
                    <p className="text-xs text-gray-400 mt-1">No prize assigned</p>
                  )}
                </div>
              </div>

              {/* Net after COGS row */}
              {cogs > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Net Revenue (after COGS)</span>
                  <span className="text-sm font-semibold text-green-700">
                    ${(money - cogs).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tokens in Game */}
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

          {/* Notes */}
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