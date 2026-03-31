// src/components/VenueReportTemplate.tsx - Complete fixed version
import React from 'react';
 
interface MachineReportData {
  machine_id: string;
  machine_name: string;
  machine_serial: string;
  total_turnover: number;
  total_tokens: number;
  commission_amount: number;
  report_count: number;
  has_data: boolean;
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
 
// Export the interface for use in other components
export type { MachineReportData };
 
// Changed from React component to utility function
export const VenueReportTemplate = ({
  venue,
  machines,
  machineReports = [],
  reports = [],
  dateRange,
  companyLogo
}: VenueReportTemplateProps) => {
  
  // Use machineReports if available (new system), otherwise fall back to reports (old system)
  const totalRevenue = machineReports.length > 0 
    ? machineReports.reduce((sum, report) => sum + report.total_turnover, 0)
    : reports.reduce((sum, report) => sum + report.money_collected, 0);
    
  const venueCommission = totalRevenue * (venue.commission_percentage / 100);
  const commissionAmount = venueCommission;
  
  const totalTokens = machineReports.length > 0
    ? machineReports.reduce((sum, report) => sum + report.total_tokens, 0)
    : reports.reduce((sum, report) => sum + report.tokens_in_game, 0);
    
  const allPaid = reports.length > 0 ? reports.every(report => report.paid_status) : true;
  const reportPeriod = `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`;
 
  const generateHTML = () => {
    // Generate machine rows using the new machineReports system
    const machineRows = machineReports.length > 0 
      ? machineReports.map(report => `
          <tr>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
              ${report.machine_name}
            </td>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
              ${report.machine_serial}
            </td>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: #28a745;">
              $${report.total_turnover.toFixed(2)}
            </td>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
              ${report.total_tokens}
            </td>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: #007bff;">
              $${report.commission_amount.toFixed(2)}
            </td>
            <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: ${report.has_data ? '#28a745' : '#dc3545'};">
              ${report.has_data ? `${report.report_count} Reports` : 'NO DATA'}
            </td>
          </tr>
        `).join('')
      : machines.map(machine => {
          // Fallback to old system
          const machineReportsForMachine = reports.filter(r => r.machine_id === machine.id);
          const machineTurnover = machineReportsForMachine.reduce((sum, r) => sum + r.money_collected, 0);
          const machineTokens = machineReportsForMachine.reduce((sum, r) => sum + r.tokens_in_game, 0);
          const machineCommission = machineTurnover * (venue.commission_percentage / 100);
          const machinePaid = machineReportsForMachine.every(r => r.paid_status);
          
          return `
            <tr>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
                ${machine.name}
              </td>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
                ${machine.serial_number || 'N/A'}
              </td>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: #28a745;">
                $${machineTurnover.toFixed(2)}
              </td>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef;">
                ${machineTokens}
              </td>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: #007bff;">
                $${machineCommission.toFixed(2)}
              </td>
              <td style="font-weight: bold; padding: 12px; border-bottom: 1px solid #e9ecef; color: ${machinePaid ? '#28a745' : '#ffc107'};">
                ${machinePaid ? 'PAID ✓' : 'PENDING'}
              </td>
            </tr>
          `;
        }).join('');
 
    // Logo — prefer uploaded company logo, fall back to file
    const logoElement = companyLogo
      ? `<img src="${companyLogo}" alt="Game On Entertainment" style="width:160px;height:90px;object-fit:contain;" />`
      : `<img src="/images/logo.jpg" alt="Game On Entertainment" style="width:160px;height:90px;object-fit:contain;" />`;
 
    // Venue image — full-width banner on page 1 if available, placeholder otherwise
    const venueImageUrl = venue.image_url
      ? (venue.image_url.startsWith('http')
          ? venue.image_url
          : `https://ogbxiolnyzidylzoljuh.supabase.co/storage/v1/object/public/images/${venue.image_url}`)
      : null;
 
    const venueImageElement = venueImageUrl
      ? `<div style="margin:25px 0;border-radius:10px;overflow:hidden;border:2px solid #ddd;max-height:260px;">
           <img src="${venueImageUrl}" alt="${venue.name}"
                style="width:100%;height:260px;object-fit:cover;display:block;"
                onerror="this.parentElement.style.display='none'" />
         </div>`
      : `<div style="margin:25px 0;height:180px;border-radius:10px;background:linear-gradient(135deg,#2c3e50,#667eea);display:flex;align-items:center;justify-content:center;">
           <p style="color:white;font-size:1.4em;font-weight:bold;margin:0;">${venue.name}</p>
         </div>`;
 
    const machinesWithData = machineReports.filter(m => m.has_data).length;
    const totalMachines = machineReports.length || machines.length;
 
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
            line-height: 1.4;
          }
          .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: white; 
            border: 1px solid #ddd; 
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          
          /* FIXED: Header layout to prevent logo overlap */
          .header { 
            background: #2c3e50; 
            color: white; 
            padding: 40px 30px 30px 30px; 
            position: relative;
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .company-branding { 
            position: absolute; 
            top: 20px; 
            right: 30px; 
            text-align: right;
            z-index: 10;
          }
          
          .company-name { 
            font-size: 12px; 
            font-weight: bold; 
            color: white; 
            margin: 5px 0 0 0;
            text-align: center;
          }
          
          .header-content {
            text-align: center;
            flex: 1;
            margin-right: 150px; /* Space for logo */
          }
          
          .title { 
            font-size: 2.2em; 
            margin-bottom: 10px; 
            font-weight: bold;
            color: white;
          }
          
          .subtitle { 
            font-size: 1.3em; 
            opacity: 0.9; 
            font-weight: bold;
            color: white;
          }
          
          .content { padding: 30px; }
          .info-section { margin-bottom: 30px; }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            margin-bottom: 30px; 
          }
          
          .info-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #667eea; 
          }
          
          .info-card h3 { 
            color: #2c3e50; 
            margin-bottom: 15px; 
            font-weight: bold; 
            font-size: 1.1em;
          }
          
          .info-card p { 
            margin-bottom: 8px; 
            font-weight: bold;
            font-size: 0.95em;
          }
          
          .summary-stats { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            margin: 30px 0; 
          }
          
          .stat-card { 
            background: #667eea; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
          }
          
          .stat-value { 
            font-size: 1.8em; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          
          .stat-label { 
            font-size: 0.9em; 
            opacity: 0.9; 
            font-weight: bold; 
          }
          
          .commission-highlight { 
            background: linear-gradient(135deg, #28a745, #20c997); 
            color: white; 
            padding: 25px; 
            border-radius: 8px; 
            text-align: center; 
            margin: 30px 0; 
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
          }
          
          .commission-highlight h3 { 
            font-size: 1.4em; 
            margin-bottom: 10px; 
            font-weight: bold; 
          }
          
          .commission-highlight p { 
            font-size: 1.1em; 
            font-weight: bold; 
          }
          
          .token-notice {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            color: #1565c0;
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
          
          .machine-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .machine-table th { 
            background: #495057; 
            color: white; 
            padding: 15px 12px; 
            text-align: left; 
            font-weight: bold;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .machine-table td { 
            padding: 12px; 
            border-bottom: 1px solid #e9ecef; 
            font-weight: bold;
            font-size: 0.9em;
          }
          
          .machine-table tr:hover { 
            background: #f8f9fa; 
          }
          
          .machine-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef;
            font-weight: bold;
          }
          
          .page-break { 
            page-break-before: always; 
          }
          
          .revenue-breakdown {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          
          .revenue-breakdown h4 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.1em;
          }
          
          .breakdown-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
            font-size: 0.95em;
          }
          
          .breakdown-item:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 1.1em;
            color: #28a745;
          }
          
          @media print { 
            body { background: white; padding: 0; } 
            .page-break { page-break-before: always; }
            .container { box-shadow: none; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
 
          <!-- ═══════════════════ PAGE 1 ═══════════════════ -->
          <div style="min-height:100vh;display:flex;flex-direction:column;page-break-after:always;">
 
            <!-- Header -->
            <div class="header">
              <div class="company-branding">
                ${logoElement}
                <p class="company-name">Game On Entertainment</p>
              </div>
              <div class="header-content">
                <h1 class="title">Venue Commission Report</h1>
                <p class="subtitle">${venue.name}</p>
                <p style="color:rgba(255,255,255,0.8);font-size:0.95em;margin-top:6px;">Period: ${reportPeriod}</p>
              </div>
            </div>
 
            <!-- Venue Image -->
            <div class="content" style="flex:1;">
              ${venueImageElement}
 
              <!-- Info grid -->
              <div class="info-grid">
                <div class="info-card">
                  <h3>Venue Information</h3>
                  <p><strong>Name:</strong> ${venue.name}</p>
                  ${venue.address ? `<p><strong>Address:</strong> ${venue.address}</p>` : ''}
                  <p><strong>Commission Rate:</strong> ${venue.commission_percentage}%</p>
                  <p><strong>Report Period:</strong> ${reportPeriod}</p>
                </div>
                <div class="info-card">
                  <h3>Report Summary</h3>
                  <p><strong>Total Machines:</strong> ${totalMachines}</p>
                  <p><strong>Machines with Data:</strong> ${machinesWithData}/${totalMachines}</p>
                  <p><strong>Date Range:</strong> ${dateRange.start} to ${dateRange.end}</p>
                  <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
              </div>
 
              <!-- Summary stats -->
              <div class="summary-stats">
                <div class="stat-card">
                  <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
                  <div class="stat-label">Total Machine Revenue</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${totalTokens}</div>
                  <div class="stat-label">Total Tokens in Machines</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${venue.commission_percentage}%</div>
                  <div class="stat-label">Commission Rate</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">$${commissionAmount.toFixed(2)}</div>
                  <div class="stat-label">Commission Amount</div>
                </div>
              </div>
 
              <!-- Revenue breakdown -->
              <div class="revenue-breakdown">
                <h4>Revenue Breakdown</h4>
                <div class="breakdown-item">
                  <span>Total Machine Revenue (${reportPeriod}):</span>
                  <span>$${totalRevenue.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                  <span>Commission Rate:</span>
                  <span>${venue.commission_percentage}%</span>
                </div>
                <div class="breakdown-item">
                  <span>Your Commission Amount:</span>
                  <span>$${commissionAmount.toFixed(2)}</span>
                </div>
              </div>
 
              <div class="token-notice">
                <strong>Important Note:</strong> Commission on tokens shown in machines is paid separately via the token machine commission system
              </div>
 
              <div class="commission-highlight">
                <h3>💰 Commission Payment Due</h3>
                <p>Total Commission Amount: <strong>$${commissionAmount.toFixed(2)}</strong></p>
                <p>Payment will be processed within 7 business days</p>
              </div>
 
              <div class="payment-status">
                <strong>Payment Status: ${allPaid ? 'ALL COMMISSIONS PAID ✓' : 'PENDING PAYMENT'}</strong>
              </div>
            </div>
          </div>
 
          <!-- ═══════════════════ PAGE 2 — Machine List ═══════════════════ -->
          <div class="page-break">
            <div class="content">
 
              <!-- Page 2 header with logo -->
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #2c3e50;">
                <div>
                  <h3 style="color:#2c3e50;font-weight:bold;font-size:1.3em;margin:0;">
                    📊 Machine Performance Breakdown
                  </h3>
                  <p style="color:#666;font-size:0.9em;margin:4px 0 0;">${reportPeriod} · ${venue.name}</p>
                </div>
                ${logoElement}
              </div>
 
              <table class="machine-table">
                <thead>
                  <tr>
                    <th>Machine Name</th>
                    <th>Serial Number</th>
                    <th>Machine Turnover</th>
                    <th>Tokens in Machine</th>
                    <th>Commission Earned</th>
                    <th>Report Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${machineRows}
                </tbody>
              </table>
 
              ${machinesWithData < totalMachines ? `
                <div style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;padding:15px;margin:20px 0;color:#856404;">
                  <strong>⚠️ Notice:</strong> ${totalMachines - machinesWithData} machine(s) have no reports for the selected date range.
                  These machines show $0.00 revenue and are not included in commission calculations.
                </div>
              ` : ''}
 
              <div style="background:#e8f5e8;border:1px solid #c3e6c3;border-radius:8px;padding:15px;margin:20px 0;color:#155724;">
                <strong>✅ Data Verification:</strong> This report is generated from actual machine reports submitted between ${reportPeriod}.
                All revenue figures are based on real cash/paywave collections from your machines.
              </div>
            </div>
          </div>
 
          <div class="footer">
            <p><strong>Report Details</strong></p>
            <p>Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>Report Period: ${reportPeriod}</p>
            <p>Total Revenue: $${totalRevenue.toFixed(2)} | Commission: $${commissionAmount.toFixed(2)}</p>
            <p style="margin-top:10px;font-size:1.1em;"><strong>Game On Entertainment</strong> — Thank you for your partnership!</p>
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
    totalTokens,
    reportPeriod,
    machinesWithData: machineReports.filter(m => m.has_data).length,
    totalMachines: machineReports.length || machines.length
  };
};
 
export default VenueReportTemplate;