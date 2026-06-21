import { supabase } from "./supabaseClient";

const BUCKET_NAME = "all-itrs";

export async function uploadFile(file: File, pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${file.name}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, { upsert: true });
  if (error) throw error;
  return data;
}

export async function getPublicUrl(pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4, filename: string) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${filename}`;
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function listFiles(pan: string, assessmentYear: string) {
  const allFiles: { folder: number; name: string; url: string }[] = [];
  for (let i = 1; i <= 4; i++) {
    const path = `${pan}/${assessmentYear}/folder-${i}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(path);
    if (data && data.length > 0) {
      data.forEach(f => {
        if (f.name !== '.emptyFolderPlaceholder') {
          const filePath = `${path}/${f.name}`;
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
          allFiles.push({ folder: i, name: f.name, url: `${urlData.publicUrl}?download=` });
        }
      });
    }
  }
  return allFiles;
}

// NEW: Delete file function
export async function deleteFile(pan: string, assessmentYear: string, folder: number, filename: string) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  if (error) throw error;
  return true;
}
