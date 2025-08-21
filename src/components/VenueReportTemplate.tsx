// src/components/VenueReportTemplate.tsx - Fixed version
import React from 'react';

interface MachineReportData {
  machine_id: string;
  machine_name: string;
  turnover: number;
  tokens: number;
  commission: number;
}

interface VenueReportTemplateProps {
  venue: {
    id: string;
    name: string;
    address?: string;
    commission_percentage: number;
    image_url?: string;
  };
  machines: Array<{
    id: string;
    name: string;
    serial_number?: string;
    type: string;
  }>;
  machineReports?: MachineReportData[];
  reports?: Array<{
    id: string;
    machine_id: string;
    money_collected: number;
    report_date: string;
    toys_dispensed: number;
    tokens_in_game: number;
    notes?: string;
    paid_status?: boolean;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
  companyLogo?: string;
}

// Changed from React component to utility function
export const VenueReportTemplate = ({
  venue,
  machines,
  machineReports = [],
  reports = [],
  dateRange,
  companyLogo
}: VenueReportTemplateProps) => {
  
  // Use machineReports if available, otherwise fall back to reports
  const totalRevenue = machineReports.length > 0 
    ? machineReports.reduce((sum, report) => sum + report.turnover, 0)
    : reports.reduce((sum, report) => sum + report.money_collected, 0);
    
  const venueCommission = totalRevenue * (venue.commission_percentage / 100);
  const commissionAmount = venueCommission;
  
  const totalTokens = machineReports.length > 0
    ? machineReports.reduce((sum, report) => sum + report.tokens, 0)
    : reports.reduce((sum, report) => sum + report.tokens_in_game, 0);
    
  const allPaid = reports.length > 0 ? reports.every(report => report.paid_status) : true;

  const generateHTML = () => {
    const machineRows = machineReports.length > 0 
      ? machineReports.map(report => {
          const machine = machines.find(m => m.id === report.machine_id);
          return `
            <tr>
              <td style="font-weight: bold;">${report.machine_name}</td>
              <td style="font-weight: bold;">${machine?.serial_number || 'N/A'}</td>
              <td style="font-weight: bold;">$${report.turnover.toFixed(2)}</td>
              <td style="font-weight: bold;">${report.tokens}</td>
              <td style="font-weight: bold;">$${report.commission.toFixed(2)}</td>
              <td style="font-weight: bold; color: #28a745;">CURRENT</td>
            </tr>
          `;
        }).join('')
      : machines.map(machine => {
          const machineReports = reports.filter(r => r.machine_id === machine.id);
          const machineTurnover = machineReports.reduce((sum, r) => sum + r.money_collected, 0);
          const machineTokens = machineReports.reduce((sum, r) => sum + r.tokens_in_game, 0);
          const machineCommission = machineTurnover * (venue.commission_percentage / 100);
          const machinePaid = machineReports.every(r => r.paid_status);
          
          return `
            <tr>
              <td style="font-weight: bold;">${machine.name}</td>
              <td style="font-weight: bold;">${machine.serial_number || 'N/A'}</td>
              <td style="font-weight: bold;">$${machineTurnover.toFixed(2)}</td>
              <td style="font-weight: bold;">${machineTokens}</td>
              <td style="font-weight: bold;">$${machineCommission.toFixed(2)}</td>
              <td style="font-weight: bold; color: ${machinePaid ? '#28a745' : '#ffc107'};">
                ${machinePaid ? 'PAID ✓' : 'PENDING'}
              </td>
            </tr>
          `;
        }).join('');

    // Use Game On logo if available
    const logoElement = companyLogo ? 
      `<img src="${companyLogo}" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />` :
      `<img src="/images/logo.jpg" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />`;

    // Fixed venue image handling - properly construct the full URL
    const venueImageElement = venue.image_url ? 
      `<div style="text-align: center; margin: 20px 0;">
        <img src="${venue.image_url.startsWith('http') ? venue.image_url : `https://ogbxiolnyzidylzoljuh.supabase.co/storage/v1/object/public/images/${venue.image_url}`}" 
             alt="${venue.name}" 
             style="max-width: 300px; max-height: 200px; object-fit: cover; border-radius: 8px; border: 2px solid #ddd;"
             onload="console.log('Venue image loaded successfully')"
             onerror="console.error('Venue image failed to load:', this.src); this.style.display='none'" />
      </div>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commission Report - ${venue.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: white; 
            padding: 20px; 
            font-weight: bold;
          }
          .container { max-width: 1000px; margin: 0 auto; background: white; border: 1px solid #ddd; }
          .header { background: #2c3e50; color: white; padding: 30px; text-align: center; position: relative; }
          .company-branding { position: absolute; top: 20px; right: 30px; text-align: right; }
          .company-name { font-size: 14px; font-weight: bold; color: white; margin: 0; }
          .title { font-size: 2em; margin-bottom: 10px; font-weight: bold; }
          .subtitle { font-size: 1.2em; opacity: 0.9; font-weight: bold; }
          .content { padding: 30px; }
          .info-section { margin-bottom: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
          .info-card h3 { color: #2c3e50; margin-bottom: 15px; font-weight: bold; }
          .info-card p { margin-bottom: 8px; font-weight: bold; }
          .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .stat-card { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
          .stat-label { font-size: 0.9em; opacity: 0.9; font-weight: bold; }
          .commission-highlight { 
            background: #28a745; 
            color: white; 
            padding: 25px; 
            border-radius: 8px; 
            text-align: center; 
            margin: 30px 0; 
            font-weight: bold;
          }
          .commission-highlight h3 { font-size: 1.4em; margin-bottom: 10px; font-weight: bold; }
          .commission-highlight p { font-size: 1.1em; font-weight: bold; }
          .token-notice {
            background: #e0f2fe;
            border: 2px solid #0288d1;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: #01579b;
            font-size: 14px;
          }
          .payment-status {
            background: ${allPaid ? '#e8f5e8' : '#fff3cd'};
            border: 2px solid ${allPaid ? '#4caf50' : '#ffc107'};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: ${allPaid ? '#2e7d32' : '#f57c00'};
            font-size: 16px;
          }
          .machine-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .machine-table th { 
            background: #495057; 
            color: white; 
            padding: 15px; 
            text-align: left; 
            font-weight: bold;
          }
          .machine-table td { 
            padding: 12px; 
            border-bottom: 1px solid #e9ecef; 
            font-weight: bold;
          }
          .machine-table tr:hover { background: #f8f9fa; }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
            font-weight: bold;
          }
          .page-break { page-break-before: always; }
          @media print { 
            body { background: white; } 
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-branding">
              ${logoElement}
              <p class="company-name">Game On Entertainment</p>
            </div>
            <h1 class="title">Venue Commission Report</h1>
            <p class="subtitle">${venue.name}</p>
          </div>
          
          <div class="content">
            ${venueImageElement}
            
            <div class="info-grid">
              <div class="info-card">
                <h3>Venue Information</h3>
                <p><strong>Name:</strong> ${venue.name}</p>
                ${venue.address ? `<p><strong>Address:</strong> ${venue.address}</p>` : ''}
                <p><strong>Commission Rate:</strong> ${venue.commission_percentage}%</p>
                <p><strong>Commission Amount:</strong> $${commissionAmount.toFixed(2)}</p>
              </div>
              <div class="info-card">
                <h3>Report Period</h3>
                <p><strong>Date Range:</strong> ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}</p>
                <p><strong>Total Machines:</strong> ${machines.length}</p>
                <p><strong>Report Type:</strong> ${machineReports.length > 0 ? 'Manual Entry' : 'Historical Data'}</p>
              </div>
            </div>
            
            <div class="summary-stats">
              <div class="stat-card">
                <div class="stat-value">${totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Machine Turnover</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${totalTokens}</div>
                <div class="stat-label">Tokens in Machines</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${venue.commission_percentage}%</div>
                <div class="stat-label">Venue Commission</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${commissionAmount.toFixed(2)}</div>
                <div class="stat-label">Commission Amount</div>
              </div>
            </div>
            
            <div class="token-notice">
              <strong>Note:</strong> Commission on the "tokens in game" is paid via the token machine commission
            </div>
            
            <div class="commission-highlight">
              <h3>Commission Payment Due</h3>
              <p>Total Commission Amount: <strong>${commissionAmount.toFixed(2)}</strong></p>
              <p>Payment will be processed within 7 business days</p>
            </div>
            
            <div class="payment-status">
              <strong>Payment Status: ${allPaid ? 'ALL COMMISSIONS PAID ✓' : 'PENDING PAYMENTS'}</strong>
            </div>
          </div>
          
          <div class="page-break">
            <div class="content">
              <h3 style="color: #2c3e50; margin-bottom: 15px; font-weight: bold;">Machine Performance Breakdown</h3>
              <table class="machine-table">
                <thead>
                  <tr>
                    <th>Machine Name</th>
                    <th>Serial Number</th>
                    <th>Machine Turnover</th>
                    <th>Tokens in Machine</th>
                    <th>Commission Earned</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${machineRows}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="footer">
            <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Date Range: ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}</p>
            <p><strong>Game On Entertainment</strong> - Thank you for your continued partnership!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return {
    generateHTML,
    totalRevenue,
    venueCommission: commissionAmount,
    totalTokens
  };
};

export default VenueReportTemplate;