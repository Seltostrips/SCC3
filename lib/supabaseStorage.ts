import { supabase } from "./supabaseClient";

const BUCKET_NAME = "all-itrs";

export async function uploadFile(file: File, pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4) {
  // FIX: Removed `${BUCKET_NAME}/` from the filePath. 
  // Supabase already knows the bucket from the `.from(BUCKET_NAME)` call.
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${file.name}`;
  
  // upsert: true ensures that if they upload a file with the same name, it overwrites it instead of crashing
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    upsert: true 
  });

  if (error) {
    throw error;
  }
  return data;
}

export async function getPublicUrl(pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4, filename: string) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${filename}`;
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}
