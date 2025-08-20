import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, Check, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MachineReport {
  id: string;
  machine_id: string;
  money_collected: number;
  current_toy_count: number;
  previous_toy_count: number;
  toys_dispensed: number;
  tokens_in_game: number;
  notes: string;
  report_date: string;
  paid_status?: boolean;
  machines?: {
    name: string;
    type: string;
    venue_id: string;
    serial_number?: string;
  };
}

interface Props {
  report: MachineReport;
  venue?: { name: string; address?: string; commission_percentage?: number };
}

const MachineReportViewer: React.FC<Props> = ({ report, venue }) => {
  const { companyLogo } = useAppContext();
  const { toast } = useToast();
  const [paidStatus, setPaidStatus] = useState(report.paid_status || false);
  const [updating, setUpdating] = useState(false);
  
  const updatePaidStatus = async (newStatus: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('machine_reports')
        .update({ paid_status: newStatus })
        .eq('id', report.id);

      if (error) throw error;

      setPaidStatus(newStatus);
      toast({
        title: 'Success',
        description: `Report marked as ${newStatus ? 'paid' : 'unpaid'}`,
      });
    } catch (error) {
      console.error('Error updating paid status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const downloadReport = () => {
    const htmlContent = generateReportHTML();
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `machine-report-${report.machines?.name || 'unknown'}-${report.report_date}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(generateReportHTML());
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 1000);
  };

  const generateReportHTML = () => {
    const machine = report.machines;
    const reportDate = new Date(report.report_date).toLocaleDateString();
    
    const totalCashPaywave = report.money_collected;
    const tokensInMachine = report.tokens_in_game;
    const totalGameRevenue = totalCashPaywave;
    const venueCommissionPercent = venue?.commission_percentage || 30;
    const venueCommissionAmount = totalGameRevenue * (venueCommissionPercent / 100);
    
    // Use Game On logo if available
    const logoElement = companyLogo ? 
      `<img src="${companyLogo}" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />` :
      `<img src="/images/logo.jpg" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Machine Report - ${machine?.name || 'Unknown'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 15px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            font-size: 14px;
            font-weight: bold;
          }
          .header { 
            position: relative;
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #dc2626; 
            padding-bottom: 15px; 
          }
          .company-branding {
            position: absolute;
            top: 0;
            right: 0;
            text-align: right;
            width: 200px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #dc2626;
            margin: 0;
          }
          .header h1 { 
            color: #dc2626; 
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: bold;
          }
          .machine-info {
            margin: 15px 0;
            text-align: center;
            font-size: 13px;
            font-weight: bold;
          }
          .metrics-list {
            background: #fff;
            border: 2px solid #000;
            border-radius: 6px;
            padding: 20px;
            margin: 15px 0;
          }
          .metric-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #000;
            font-size: 14px;
            font-weight: bold;
          }
          .metric-item:last-child {
            border-bottom: none;
          }
          .metric-label {
            font-weight: bold;
            color: #000;
          }
          .metric-value {
            font-weight: bold;
            color: #dc2626;
            font-size: 16px;
          }
          .commission-notice {
            background: #f8f8f8;
            border: 2px solid #dc2626;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: #000;
            font-size: 13px;
          }
          .token-notice {
            background: #e0f2fe;
            border: 2px solid #0288d1;
            border-radius: 6px;
            padding: 12px;
            margin: 15px 0;
            text-align: center;
            font-weight: bold;
            color: #01579b;
            font-size: 12px;
          }
          .payment-status {
            background: ${paidStatus ? '#e8f5e8' : '#fff3cd'};
            border: 2px solid ${paidStatus ? '#4caf50' : '#ffc107'};
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: ${paidStatus ? '#2e7d32' : '#f57c00'};
            font-size: 14px;
          }
          .footer {
            margin-top: 25px;
            text-align: center;
            font-size: 11px;
            color: #000;
            border-top: 1px solid #000;
            padding-top: 15px;
            font-weight: bold;
          }
          @media print { 
            button { display: none !important; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-branding">
            ${logoElement}
            <p class="company-name">Game On Entertainment</p>
          </div>
          <h1>Machine Report</h1>
          <div class="machine-info">
            <p><strong>Machine:</strong> ${machine?.name || 'Unknown Machine'}</p>
            <p><strong>Serial Number:</strong> ${machine?.serial_number || 'N/A'}</p>
            <p><strong>Venue:</strong> ${venue?.name || 'Unknown Venue'}</p>
            <p><strong>Address:</strong> ${venue?.address || 'N/A'}</p>
            <p><strong>Report Date:</strong> ${reportDate}</p>
          </div>
        </div>
        
        <div class="metrics-list">
          <div class="metric-item">
            <span class="metric-label">Total Cash / Paywave in Machine:</span>
            <span class="metric-value">$${totalCashPaywave.toFixed(2)}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Tokens in Machine:</span>
            <span class="metric-value">${tokensInMachine}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Total Game Revenue:</span>
            <span class="metric-value">$${totalGameRevenue.toFixed(2)}</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Venue Commission %:</span>
            <span class="metric-value">${venueCommissionPercent}%</span>
          </div>
          
          <div class="metric-item">
            <span class="metric-label">Venue Commission Amount:</span>
            <span class="metric-value">$${venueCommissionAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="token-notice">
          <strong>Note:</strong> Commission on the "tokens in game" is paid via the token machine commission
        </div>
        
        <div class="commission-notice">
          <strong>Your commission will be paid into your nominated bank account within 3 business days</strong>
        </div>
        
        <div class="payment-status">
          <strong>Payment Status: ${paidStatus ? 'PAID ✓' : 'PENDING PAYMENT'}</strong>
        </div>
        
        ${report.notes ? `
        <div style="background: #f8f8f8; padding: 15px; border: 1px solid #000; border-radius: 6px; margin: 15px 0; font-size: 13px; font-weight: bold;">
          <h3 style="margin-top: 0; color: #000; font-size: 14px; font-weight: bold;">Notes</h3>
          <p style="margin: 0; color: #000; font-weight: bold;">${report.notes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p><strong>Game On Entertainment</strong></p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 10px;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #000; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Close</button>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="flex gap-2 items-center">
      <Button 
        size="sm" 
        variant="outline"
        onClick={downloadReport}
        className="flex items-center gap-1"
      >
        <Download className="h-3 w-3" />
        Download
      </Button>
      <Button 
        size="sm" 
        variant="outline"
        onClick={printReport}
        className="flex items-center gap-1"
      >
        <Printer className="h-3 w-3" />
        Print
      </Button>
      <Button
        size="sm"
        variant={paidStatus ? "default" : "outline"}
        onClick={() => updatePaidStatus(!paidStatus)}
        disabled={updating}
        className={`flex items-center gap-1 ${
          paidStatus 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'border-orange-400 text-orange-600 hover:bg-orange-50'
        }`}
      >
        {paidStatus ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
        {updating ? 'Updating...' : (paidStatus ? 'Paid' : 'Mark Paid')}
      </Button>
    </div>
  );
};

export default MachineReportViewer;