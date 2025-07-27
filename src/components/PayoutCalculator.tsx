import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

interface PayoutCalculatorProps {
  machineId: string;
}

const PayoutCalculator: React.FC<PayoutCalculatorProps> = ({ machineId }) => {
  const { machines } = useAppContext();
  const [payoutData, setPayoutData] = useState<{
    percentage: number | null;
    earnings: number;
    prizeValue: number;
    toysDispensed: number;
    loading: boolean;
  }>({ percentage: null, earnings: 0, prizeValue: 0, toysDispensed: 0, loading: true });

  useEffect(() => {
    calculatePayout();
  }, [machineId, machines]);

  const calculatePayout = async () => {
    try {
      setPayoutData(prev => ({ ...prev, loading: true }));
      
      // Get the latest report for this machine
      const { data: reportData, error: reportError } = await supabase
        .from('machine_reports')
        .select('money_collected, prize_value, toys_dispensed, current_toy_count, previous_toy_count')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (reportError) throw reportError;
      
      if (!reportData || reportData.length === 0) {
        setPayoutData({ percentage: null, earnings: 0, prizeValue: 0, toysDispensed: 0, loading: false });
        return;
      }
      
      const report = reportData[0];
      const earnings = report.money_collected || 0;
      let prizeValue = report.prize_value || 0;
      let toysDispensed = report.toys_dispensed || 0;
      
      // If prize_value is 0 but toys were dispensed, calculate it
      if (prizeValue === 0 && toysDispensed > 0) {
        const machine = machines.find(m => m.id === machineId);
        if (machine?.current_prize) {
          prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
        }
      }
      
      // If toys_dispensed is 0, try to calculate from counter difference
      if (toysDispensed === 0 && report.current_toy_count !== null && report.previous_toy_count !== null) {
        toysDispensed = Math.max(0, report.current_toy_count - report.previous_toy_count);
        
        // Recalculate prize value with correct toys dispensed
        if (toysDispensed > 0) {
          const machine = machines.find(m => m.id === machineId);
          if (machine?.current_prize) {
            prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
          }
        }
      }
      
      // Calculate payout percentage
      const percentage = earnings > 0 && prizeValue > 0 ? (prizeValue / earnings) * 100 : 0;
      
      setPayoutData({
        percentage: percentage > 0 ? Math.round(percentage * 100) / 100 : null,
        earnings,
        prizeValue,
        toysDispensed,
        loading: false
      });
      
    } catch (error) {
      console.error('Error calculating payout:', error);
      setPayoutData({ percentage: null, earnings: 0, prizeValue: 0, toysDispensed: 0, loading: false });
    }
  };

  if (payoutData.loading) {
    return (
      <div className="text-red-700">
        <strong>Payout %:</strong> <span className="text-gray-500">Calculating...</span>
      </div>
    );
  }

  if (payoutData.percentage === null) {
    return (
      <div className="text-red-700">
        <strong>Payout %:</strong> <span className="text-gray-500">No data</span>
      </div>
    );
  }

  const isHighPayout = payoutData.percentage > 30;
  const isLowPayout = payoutData.percentage < 10;
  const hasIssue = isHighPayout || isLowPayout;

  return (
    <div className="space-y-1">
      <div className="text-red-700">
        <strong>Payout %:</strong> 
        <span className={`ml-2 font-bold ${
          hasIssue ? 'text-red-600' : 'text-green-600'
        } ${
          hasIssue ? 'border-2 border-red-500 rounded-full px-2 py-1' : ''
        }`}>
          {payoutData.percentage}%
        </span>
      </div>
      <div className="text-xs text-gray-600">
        Latest Report - Revenue: ${payoutData.earnings.toFixed(2)} | Prize Value: ${payoutData.prizeValue.toFixed(2)} | Toys: {payoutData.toysDispensed}
      </div>
    </div>
  );
};

export default PayoutCalculator;