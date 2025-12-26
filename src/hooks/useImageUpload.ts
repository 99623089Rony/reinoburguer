import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseImageUploadResult {
    uploadImage: (file: File, bucket: 'products' | 'store-assets', path?: string) => Promise<string | null>;
    uploading: boolean;
    error: string | null;
}

export const useImageUpload = (): UseImageUploadResult => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadImage = async (file: File, bucket: 'products' | 'store-assets', path?: string): Promise<string | null> => {
        setUploading(true);
        setError(null);

        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error('Por favor, selecione apenas arquivos de imagem.');
            }

            // Generate file path
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = path ? `${path}/${fileName}` : fileName;

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return data.publicUrl;

        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Erro ao fazer upload da imagem.');
            return null;
        } finally {
            setUploading(false);
        }
    };

    return { uploadImage, uploading, error };
};
