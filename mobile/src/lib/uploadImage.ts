import * as ImageManipulator from 'expo-image-manipulator';
import { getSupabaseClient } from './supabase';

export async function uploadImage(
  uri: string,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = getSupabaseClient();

  // Resize image to max 600x600
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Read the file as blob
  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
