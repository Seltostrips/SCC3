import { supabase } from "./supabaseClient";

const BUCKET_NAME = "all-itrs";

export async function uploadFile(file: File, pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4) {
  const filePath = `${BUCKET_NAME}/${pan}/${assessmentYear}/folder-${folder}/${file.name}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);

  if (error) {
    throw error;
  }
  return data;
}

export async function getPublicUrl(pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4, filename: string) {
  const filePath = `${BUCKET_NAME}/${pan}/${assessmentYear}/folder-${folder}/${filename}`;
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}
