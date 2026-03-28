import * as ImageManipulator from 'expo-image-manipulator';
import { getApiBaseCandidates, joinApiUrl, rememberWorkingApiBaseUrl } from './apiConfig';
import { supabase } from './supabase';

export async function uploadImage(
  uri: string,
  bucket: string
): Promise<string> {
  // Resize image to max 600x600
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('You must be logged in to upload images.');
  }

  const formData = new FormData();
  formData.append('bucket', bucket);
  formData.append('file', {
    uri: manipulated.uri,
    name: `${bucket}-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);

  let response: Response | null = null;
  let networkError: unknown = null;

  for (const baseUrl of getApiBaseCandidates()) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      response = await fetch(joinApiUrl(baseUrl, '/api/uploads/image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      rememberWorkingApiBaseUrl(baseUrl);
      break;
    } catch (error) {
      clearTimeout(timeoutId);
      networkError = error;
    }
  }

  if (!response) {
    if (networkError instanceof Error) {
      throw networkError;
    }

    throw new Error('Image upload failed.');
  }

  let payload: { error?: string; publicUrl?: string } = {};
  try {
    payload = await response.json();
  } catch (parseErr) {
    if (__DEV__) console.warn('Upload response parse failed:', parseErr);
  }

  if (!response.ok || !payload.publicUrl) {
    throw new Error(payload.error || 'Image upload failed.');
  }

  return payload.publicUrl;
}
