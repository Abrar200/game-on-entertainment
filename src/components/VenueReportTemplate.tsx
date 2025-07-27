import React from 'react';

interface VenueReportTemplateProps {
  venue: {
    id: string;
    name: string;
    address?: string;
    commission_percentage: number;
  };
  machines: Array<{
    id: string;
    name: string;
    serial_number?: string;
    type: string;
  }>;
  reports: Array<{
    id: string;
    machine_id: string;
    money_collected: number;
    report_date: string;
    toys_dispensed: number;
    tokens_in_game: number;
    notes?: string;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
  companyLogo?: string;
}

const VenueReportTemplate: React.FC<VenueReportTemplateProps> = ({
  venue,
  machines,
  reports,
  dateRange,
  companyLogo
}) => {
  const totalRevenue = reports.reduce((sum, report) => sum + report.money_collected, 0);
  const venueCommission = totalRevenue * (venue.commission_percentage / 100);
  const commissionAmount = venueCommission;
  const totalTokens = reports.reduce((sum, report) => sum + report.tokens_in_game, 0);

  const generateReportHTML = () => {
    const machineRows = machines.map(machine => {
      const machineReports = reports.filter(r => r.machine_id === machine.id);
      const machineTurnover = machineReports.reduce((sum, r) => sum + r.money_collected, 0);
      const machineTokens = machineReports.reduce((sum, r) => sum + r.tokens_in_game, 0);
      const machineCommission = machineTurnover * (venue.commission_percentage / 100);
      
      return `
        <tr>
          <td>${machine.name}</td>
          <td>${machine.serial_number || 'N/A'}</td>
          <td>$${machineTurnover.toFixed(2)}</td>
          <td>${machineTokens}</td>
          <td>$${machineCommission.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Use uploaded logo if available, otherwise use default
    const logoElement = companyLogo ? 
      `<img src="${companyLogo}" alt="Game On Entertainment Logo" class="logo" style="width: 140px; height: 80px; object-fit: contain; margin-bottom: 5px;" />` :
      `<svg class="logo" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" style="width: 140px; height: 80px; margin-bottom: 5px;">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="100" fill="url(#bgGrad)" rx="12" stroke="#7f1d1d" stroke-width="2"/>
        <circle cx="50" cy="50" r="25" fill="#ffffff" stroke="#dc2626" stroke-width="3"/>
        <rect x="35" y="35" width="30" height="30" fill="#dc2626" rx="5"/>
        <circle cx="50" cy="50" r="8" fill="#ffffff"/>
        <text x="85" y="40" fill="#ffffff" font-family="Arial, sans-serif" font-size="16" font-weight="bold">GAME ON</text>
        <text x="85" y="60" fill="#ffffff" font-family="Arial, sans-serif" font-size="12" font-weight="600">ENTERTAINMENT</text>
        <circle cx="160" cy="25" r="6" fill="#fbbf24" opacity="0.8"/>
        <circle cx="170" cy="35" r="4" fill="#f59e0b" opacity="0.8"/>
        <circle cx="150" cy="40" r="3" fill="#d97706" opacity="0.8"/>
      </svg>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commission Report - ${venue.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; padding: 20px; }
          .container { max-width: 1000px; margin: 0 auto; background: white; border: 1px solid #ddd; }
          .header { background: #2c3e50; color: white; padding: 30px; text-align: center; position: relative; }
          .company-branding { position: absolute; top: 20px; right: 30px; text-align: right; }
          .company-name { font-size: 14px; font-weight: bold; color: white; margin: 0; }
          .title { font-size: 2em; margin-bottom: 10px; }
          .subtitle { font-size: 1.2em; opacity: 0.9; }
          .content { padding: 30px; }
          .info-section { margin-bottom: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
          .info-card h3 { color: #2c3e50; margin-bottom: 15px; }
          .info-card p { margin-bottom: 8px; }
          .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .stat-card { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
          .stat-label { font-size: 0.9em; opacity: 0.9; }
          .commission-highlight { background: #28a745; color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; }
          .commission-highlight h3 { font-size: 1.4em; margin-bottom: 10px; }
          .commission-highlight p { font-size: 1.1em; }
          .machine-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .machine-table th { background: #495057; color: white; padding: 15px; text-align: left; }
          .machine-table td { padding: 12px; border-bottom: 1px solid #e9ecef; }
          .machine-table tr:hover { background: #f8f9fa; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; border-top: 1px solid #e9ecef; }
          @media print { body { background: white; } }
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
            <div class="info-grid">
              <div class="info-card">
                <h3>Venue Information</h3>
                <p><strong>Name:</strong> ${venue.name}</p>
                ${venue.address ? `<p><strong>Address:</strong> ${venue.address}</p>` : ''}
                <p><strong>Commission Rate:</strong> ${venue.commission_percentage}%</p>
              </div>
              <div class="info-card">
                <h3>Report Period</h3>
                <p><strong>Date Range:</strong> ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}</p>
                <p><strong>Total Machines:</strong> ${machines.length}</p>
                <p><strong>Total Reports:</strong> ${reports.length}</p>
              </div>
            </div>
            
            <div class="summary-stats">
              <div class="stat-card">
                <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
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
                <div class="stat-value">$${commissionAmount.toFixed(2)}</div>
                <div class="stat-label">Commission Amount</div>
              </div>
            </div>
            
            <div class="commission-highlight">
              <h3>💰 Commission Payment Due</h3>
              <p>Total Commission Amount: <strong>$${commissionAmount.toFixed(2)}</strong></p>
              <p>Payment will be processed within 7 business days</p>
            </div>
            
            <h3 style="color: #2c3e50; margin-bottom: 15px;">Machine Performance Breakdown</h3>
            <table class="machine-table">
              <thead>
                <tr>
                  <th>Machine Name</th>
                  <th>Serial Number</th>
                  <th>Machine Turnover</th>
                  <th>Tokens in Machine</th>
                  <th>Commission Earned</th>
                </tr>
              </thead>
              <tbody>
                ${machineRows}
              </tbody>
            </table>
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
    generateHTML: generateReportHTML,
    totalRevenue,
    venueCommission: commissionAmount,
    totalTokens
  };
};

export default VenueReportTemplate;