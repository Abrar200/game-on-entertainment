import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Code, Database, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

const CodeDownloader = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const projectInfo = {
    supabaseUrl: 'https://bwmrnlbjjakqnmqvxiso.supabase.co',
    projectId: 'bwmrnlbjjakqnmqvxiso',
    tables: ['venues', 'machines', 'prizes', 'machine_stock', 'machine_reports', 'report_pdfs', 'machine_stock_movements'],
    buckets: ['images', 'reports']
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generateProjectInfo = async () => {
    setIsGenerating(true);
    try {
      const instructions = `# Claw Machine Management System - Project Information

## Frontend Code Structure
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- React Router for navigation
- Context API for state management

## Key Components:
- Dashboard with analytics
- Venue management
- Machine tracking
- Prize inventory
- Report generation
- Stock movement tracking

## Backend (Supabase):
Project ID: ${projectInfo.projectId}
URL: ${projectInfo.supabaseUrl}

## Database Tables:
${projectInfo.tables.map(table => `- ${table}`).join('\n')}

## Storage Buckets:
${projectInfo.buckets.map(bucket => `- ${bucket}`).join('\n')}

## Dependencies (from package.json):
- React + React DOM
- @supabase/supabase-js
- @radix-ui components
- Tailwind CSS
- React Hook Form
- Recharts for analytics
- jsPDF for reports

## To Download Your Code:
1. Famous.ai users: Export from dashboard
2. Local dev: Copy project folder
3. Database: Export from Supabase dashboard

## Deployment:
- Frontend: Vercel, Netlify, or any static host
- Backend: Already hosted on Supabase

Generated: ${new Date().toISOString()}`;

      const blob = new Blob([instructions], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'claw-machine-project-info.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Project information downloaded!');
    } catch (error) {
      toast.error('Failed to generate download');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Download Your Code & Project Information
          </CardTitle>
          <CardDescription>
            Get complete information about your claw machine management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Frontend Application
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  React TypeScript application with modern UI components
                </p>
                <ul className="text-sm space-y-1 mb-4">
                  <li>• React 18 + TypeScript</li>
                  <li>• Tailwind CSS + shadcn/ui</li>
                  <li>• Dashboard & analytics</li>
                  <li>• Complete CRUD operations</li>
                  <li>• PDF report generation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Supabase Backend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete database with authentication and storage
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Project ID:</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(projectInfo.projectId)}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-mono text-xs bg-muted p-2 rounded">
                    {projectInfo.projectId}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Database Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Tables:</h4>
                  <ul className="text-sm space-y-1">
                    {projectInfo.tables.map(table => (
                      <li key={table} className="font-mono bg-muted px-2 py-1 rounded">
                        {table}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Storage Buckets:</h4>
                  <ul className="text-sm space-y-1">
                    {projectInfo.buckets.map(bucket => (
                      <li key={bucket} className="font-mono bg-muted px-2 py-1 rounded">
                        {bucket}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2 text-blue-900">How to Access Your Code:</h3>
            <ol className="text-sm space-y-2 list-decimal list-inside text-blue-800">
              <li><strong>Famous.ai Users:</strong> Go to your dashboard → Export Project</li>
              <li><strong>Local Development:</strong> Your code is in your project folder</li>
              <li><strong>Database Access:</strong> Login to Supabase dashboard with your account</li>
              <li><strong>Complete Backup:</strong> Export both frontend code and database</li>
            </ol>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={generateProjectInfo}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download Project Info'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.open(projectInfo.supabaseUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Supabase Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeDownloader;