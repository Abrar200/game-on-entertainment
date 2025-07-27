import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { Code, GitBranch, Upload, Settings, Database, FileText, Home } from 'lucide-react';

export default function EditingGuide() {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold mb-2">App Editing & Updates Guide</h1>
          <p className="text-muted-foreground">How to make changes to your published web app</p>
        </div>
        <div className="w-32"></div>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Your app is built with React + Supabase. Frontend changes require rebuilding, backend changes are instant.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Frontend Changes (UI, Components, Logic)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">Required Tools</Badge>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Code editor (VS Code recommended)</li>
                <li>Node.js installed</li>
                <li>Git (optional but recommended)</li>
              </ul>
            </div>
            <Separator />
            <div>
              <Badge variant="outline" className="mb-2">Steps to Update</Badge>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Edit your React files (components, pages, styles)</li>
                <li>Test locally: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                <li>Build for production: <code className="bg-gray-100 px-1 rounded">npm run build</code></li>
                <li>Upload new <code className="bg-gray-100 px-1 rounded">dist</code> folder to your hosting service</li>
                <li>Changes go live immediately</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backend Changes (Database, Functions)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">Instant Updates</Badge>
              <p className="text-sm text-muted-foreground mb-3">
                Backend changes through Supabase dashboard are live immediately - no rebuilding needed!
              </p>
            </div>
            <Separator />
            <div>
              <Badge variant="outline" className="mb-2">What You Can Change</Badge>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Database tables, columns, relationships</li>
                <li>Row Level Security (RLS) policies</li>
                <li>Edge functions (serverless backend logic)</li>
                <li>Storage buckets and file permissions</li>
                <li>Authentication settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Deployment Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Badge className="mb-2">Manual Deployment</Badge>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Make changes locally</li>
                  <li>Run <code className="bg-gray-100 px-1 rounded">npm run build</code></li>
                  <li>Upload dist folder to hosting</li>
                </ol>
              </div>
              <div>
                <Badge variant="secondary" className="mb-2">Auto Deployment</Badge>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Push code to GitHub</li>
                  <li>Connect repo to Vercel/Netlify</li>
                  <li>Auto-deploy on every push</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Common Edit Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Change app colors/styling:</strong> Edit <code className="bg-gray-100 px-1 rounded">tailwind.config.ts</code> or component classes
              </div>
              <div>
                <strong>Add new features:</strong> Create new components in <code className="bg-gray-100 px-1 rounded">src/components/</code>
              </div>
              <div>
                <strong>Modify data structure:</strong> Update Supabase tables via dashboard
              </div>
              <div>
                <strong>Change business logic:</strong> Edit components or create new Edge functions
              </div>
              <div>
                <strong>Update text/content:</strong> Edit component files directly
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}