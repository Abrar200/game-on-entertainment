import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  folder: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUploaded, currentImage, folder }) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];

      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file.');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      console.log('Uploading file:', fileName);

      const { data, error: uploadError } = await supabase.storage
        .from('venues')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!data?.path) {
        throw new Error('Upload succeeded but no path returned');
      }

      const { data: urlData } = supabase.storage
        .from('venues')
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('Upload successful, URL:', urlData.publicUrl);
      onImageUploaded(urlData.publicUrl);
      toast({ title: 'Success', description: 'Image uploaded successfully!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error uploading image',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://bwmrnlbjjakqnmqvxiso.supabase.co/storage/v1/object/public/images/${url}`;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="image">Image</Label>
      <Input
        id="image"
        type="file"
        accept="image/*"
        onChange={uploadImage}
        disabled={uploading}
      />
      {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
      {currentImage && (
        <div className="mt-2 flex justify-center">
          <div className="w-48 h-32 border rounded overflow-hidden bg-gray-50">
            <img
              src={getImageUrl(currentImage)}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;