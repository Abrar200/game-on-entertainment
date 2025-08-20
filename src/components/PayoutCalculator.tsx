import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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
    reportCount: number;
    lastReport: string | null;
  }>({ 
    percentage: null, 
    earnings: 0, 
    prizeValue: 0, 
    toysDispensed: 0, 
    loading: true,
    reportCount: 0,
    lastReport: null
  });

  useEffect(() => {
    calculatePayout();
  }, [machineId, machines]);

  const calculatePayout = async () => {
    try {
      setPayoutData(prev => ({ ...prev, loading: true }));
      
      console.log('💰 Calculating payout for machine:', machineId);
      
      // Get all reports for this machine to calculate comprehensive data
      const { data: reportData, error: reportError } = await supabase
        .from('machine_reports')
        .select('money_collected, prize_value, toys_dispensed, current_toy_count, previous_toy_count, report_date, created_at')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false });
      
      if (reportError) {
        console.error('❌ Error fetching reports:', reportError);
        throw reportError;
      }
      
      if (!reportData || reportData.length === 0) {
        console.log('📊 No reports found for machine:', machineId);
        setPayoutData({ 
          percentage: null, 
          earnings: 0, 
          prizeValue: 0, 
          toysDispensed: 0, 
          loading: false,
          reportCount: 0,
          lastReport: null
        });
        return;
      }
      
      console.log('📈 Found', reportData.length, 'reports for machine');
      
      // Get the latest report for current payout calculation
      const latestReport = reportData[0];
      
      // Calculate totals from all reports
      const totalEarnings = reportData.reduce((sum, report) => sum + (report.money_collected || 0), 0);
      const totalToysDispensed = reportData.reduce((sum, report) => {
        // Calculate toys dispensed if not already calculated
        let toys = report.toys_dispensed || 0;
        if (toys === 0 && report.current_toy_count !== null && report.previous_toy_count !== null) {
          toys = Math.max(0, report.current_toy_count - report.previous_toy_count);
        }
        return sum + toys;
      }, 0);
      
      // Calculate prize value from latest report or estimate from machine's current prize
      let prizeValue = latestReport.prize_value || 0;
      let toysDispensed = latestReport.toys_dispensed || 0;
      
      // If toys_dispensed is 0, try to calculate from counter difference
      if (toysDispensed === 0 && latestReport.current_toy_count !== null && latestReport.previous_toy_count !== null) {
        toysDispensed = Math.max(0, latestReport.current_toy_count - latestReport.previous_toy_count);
      }
      
      // If prize_value is 0 but toys were dispensed, calculate it
      if (prizeValue === 0 && toysDispensed > 0) {
        const machine = machines.find(m => m.id === machineId);
        if (machine?.current_prize) {
          prizeValue = toysDispensed * parseFloat(machine.current_prize.cost.toString());
        }
      }
      
      // Calculate payout percentage from latest report
      const earnings = latestReport.money_collected || 0;
      const percentage = earnings > 0 && prizeValue > 0 ? (prizeValue / earnings) * 100 : 0;
      
      // Format last report date
      const lastReportDate = latestReport.report_date || latestReport.created_at;
      
      setPayoutData({
        percentage: percentage > 0 ? Math.round(percentage * 100) / 100 : null,
        earnings: totalEarnings, // Show total earnings, not just latest
        prizeValue,
        toysDispensed: totalToysDispensed, // Show total toys dispensed
        loading: false,
        reportCount: reportData.length,
        lastReport: lastReportDate ? new Date(lastReportDate).toLocaleDateString() : null
      });
      
      console.log('✅ Payout calculated:', {
        percentage: percentage.toFixed(2) + '%',
        totalEarnings,
        prizeValue,
        totalToysDispensed,
        reportCount: reportData.length
      });
      
    } catch (error) {
      console.error('❌ Error calculating payout:', error);
      setPayoutData({ 
        percentage: null, 
        earnings: 0, 
        prizeValue: 0, 
        toysDispensed: 0, 
        loading: false,
        reportCount: 0,
        lastReport: null
      });
    }
  };

  if (payoutData.loading) {
    return (
      <div className="text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <strong>Calculating...</strong>
        </div>
      </div>
    );
  }

  if (payoutData.reportCount === 0) {
    return (
      <div className="text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <strong>No Reports:</strong>
          <span className="text-sm">Generate a machine report to see payout data</span>
        </div>
      </div>
    );
  }

  const isHighPayout = payoutData.percentage && payoutData.percentage > 30;
  const isLowPayout = payoutData.percentage && payoutData.percentage < 10;
  const hasIssue = isHighPayout || isLowPayout;

  return (
    <div className="space-y-2">
      <div className={`p-3 rounded-lg border-2 ${
        hasIssue 
          ? isHighPayout 
            ? 'bg-red-50 border-red-300' 
            : 'bg-yellow-50 border-yellow-300'
          : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasIssue ? (
              <AlertTriangle className={`h-4 w-4 ${
                isHighPayout ? 'text-red-600' : 'text-yellow-600'
              }`} />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
            <strong className={`${
              hasIssue 
                ? isHighPayout ? 'text-red-700' : 'text-yellow-700'
                : 'text-green-700'
            }`}>
              Payout %:
            </strong>
          </div>
          <div className={`text-xl font-bold ${
            hasIssue 
              ? isHighPayout ? 'text-red-600' : 'text-yellow-600'
              : 'text-green-600'
          }`}>
            {payoutData.percentage ? `${payoutData.percentage}%` : 'N/A'}
          </div>
        </div>
        
        {hasIssue && (
          <div className={`mt-2 text-xs font-medium ${
            isHighPayout ? 'text-red-700' : 'text-yellow-700'
          }`}>
            {isHighPayout 
              ? '⚠️ PAYOUT TOO HIGH - Check prize cost or claw settings'
              : '⚠️ PAYOUT TOO LOW - May need easier gameplay or cheaper prizes'
            }
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="font-medium text-blue-700">Total Earnings</div>
          <div className="text-blue-600 font-bold">${payoutData.earnings.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded p-2">
          <div className="font-medium text-purple-700">Toys Dispensed</div>
          <div className="text-purple-600 font-bold">{payoutData.toysDispensed}</div>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <div className="flex justify-between">
          <span>Reports: {payoutData.reportCount}</span>
          <span>Last: {payoutData.lastReport || 'Never'}</span>
        </div>
        {payoutData.percentage && (
          <div className="mt-1">
            Latest Report - Prize Value: ${payoutData.prizeValue.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutCalculator;