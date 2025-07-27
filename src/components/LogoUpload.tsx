import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LogoUploadProps {
  onLogoUploaded: (logoUrl: string) => void;
  currentLogo?: string;
}

const LogoUpload = ({ onLogoUploaded, currentLogo }: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName);
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Upload error:', error);
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          onLogoUploaded(base64);
          toast({
            title: 'Logo Set',
            description: 'Logo has been set locally (storage upload failed)',
          });
        };
        reader.readAsDataURL(file);
        return;
      }
      
      console.log('Upload successful:', data);
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      console.log('Public URL:', publicUrl);
      
      onLogoUploaded(publicUrl);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully!',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onLogoUploaded(base64);
        toast({
          title: 'Logo Set',
          description: 'Logo has been set locally',
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadLogo(file);
  };

  const removeLogo = () => {
    onLogoUploaded('');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Upload Logo</CardTitle>
      </CardHeader>
      <CardContent>
        {currentLogo ? (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={currentLogo} 
                alt="Current logo" 
                className="w-full h-32 object-contain bg-gray-50 rounded-lg"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={removeLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">Upload a new logo to replace the current one</p>
          </div>
        ) : null}
        
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop your logo here, or click to select
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports: JPG, PNG, GIF (max 5MB)
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="logo-upload"
            disabled={uploading}
          />
          <Button
            asChild
            disabled={uploading}
            className="cursor-pointer"
          >
            <label htmlFor="logo-upload">
              {uploading ? 'Uploading...' : 'Select Logo'}
            </label>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUpload;