import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, Download, ArrowLeft, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFViewerProps {
  reportData: any[];
  reportType: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ reportData, reportType }) => {
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const generatePDFPreview = async () => {
    if (reportData.length === 0) {
      toast({ title: 'Error', description: 'No data to generate PDF', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const totalRevenue = reportData.reduce((sum, item) => sum + item.total_money, 0);
      const totalCommission = reportData.reduce((sum, item) => sum + (item.venue_commission || 0), 0);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Venue Revenue Report</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                background: white;
                color: #333;
              }
              .header { 
                text-align: center; 
                margin-bottom: 40px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
              }
              h1 { 
                color: #2563eb; 
                font-size: 28px;
                margin-bottom: 10px;
              }
              .venue-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #2563eb;
              }
              .revenue-summary {
                background: linear-gradient(135deg, #1f2937, #374151);
                color: white;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 30px;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                border: 2px solid #10b981;
              }
              .revenue-summary h2 {
                margin: 0 0 20px 0;
                font-size: 28px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
              }
              .revenue-item {
                display: inline-block;
                margin: 0 20px;
                text-align: center;
              }
              .revenue-amount {
                font-size: 36px;
                font-weight: bold;
                display: block;
                margin-bottom: 5px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
              }
              .revenue-label {
                font-size: 16px;
                font-weight: bold;
                opacity: 0.9;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
              }
              th, td { 
                padding: 15px; 
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
              }
              th { 
                background: #f3f4f6; 
                font-weight: bold;
                color: #374151;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              tr:hover {
                background-color: #f9fafb;
              }
              .money { 
                color: #10b981; 
                font-weight: bold;
                font-size: 16px;
              }
              .commission { 
                color: #f59e0b; 
                font-weight: bold;
                font-size: 16px;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Venue Revenue Report</h1>
              <p style="font-size: 16px; color: #6b7280;">Generated on ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            
            <div class="revenue-summary">
              <h2>Financial Summary</h2>
              <div class="revenue-item">
                <span class="revenue-amount">$${totalRevenue.toFixed(2)}</span>
                <span class="revenue-label">Total Revenue</span>
              </div>
              <div class="revenue-item">
                <span class="revenue-amount">$${totalCommission.toFixed(2)}</span>
                <span class="revenue-label">Your Commission</span>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Gross Revenue</th>
                  <th>Commission Rate</th>
                  <th>Your Commission</th>
                  <th>Toys Dispensed</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.map(item => `
                  <tr>
                    <td style="font-weight: 600;">${item.machine_name}</td>
                    <td class="money">$${item.total_money.toFixed(2)}</td>
                    <td style="font-weight: 600;">${(item.venue_commission_percentage || 0).toFixed(1)}%</td>
                    <td class="commission">$${(item.venue_commission || 0).toFixed(2)}</td>
                    <td>${item.total_toys}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Thank you for partnering with us!</p>
              <p>Report generated automatically from machine data</p>
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      toast({ title: 'Success', description: 'Venue report generated!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `venue-revenue-report-${Date.now()}.html`;
    link.click();
    
    toast({ title: 'Success', description: 'Report downloaded!' });
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const closePDF = () => {
    setPdfUrl(null);
    setIsFullscreen(false);
  };

  if (isFullscreen && pdfUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <h3 className="text-lg font-semibold">Venue Revenue Report</h3>
          <div className="flex gap-2">
            <Button onClick={downloadPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={closeFullscreen} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={closePDF} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <iframe 
          src={pdfUrl} 
          className="flex-1 w-full border-0"
          title="Venue Report Fullscreen"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Venue Revenue Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={generatePDFPreview} 
            disabled={generating || reportData.length === 0}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
          
          {pdfUrl && (
            <>
              <Button 
                onClick={downloadPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={closePDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </>
          )}
        </div>
        
        {pdfUrl && (
          <div className="border rounded-lg overflow-hidden relative">
            <div className="absolute top-2 right-2 z-10">
              <Button 
                onClick={openFullscreen}
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white"
              >
                <Eye className="h-4 w-4 mr-1" />
                Fullscreen
              </Button>
            </div>
            <iframe 
              src={pdfUrl} 
              className="w-full h-96 border-0"
              title="Venue Report Preview"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFViewer;