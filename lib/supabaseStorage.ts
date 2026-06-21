import { supabase } from "./supabaseClient";

const BUCKET_NAME = "all-itrs";

export async function uploadFile(file: File, pan: string, assessmentYear: string, folder: 1 | 2 | 3 | 4) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${file.name}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, { upsert: true });
  if (error) throw error;
  return data;
}

export async function listFiles(pan: string, assessmentYear: string) {
  const allFiles: { folder: number; name: string; url: string }[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const path = `${pan}/${assessmentYear}/folder-${i}`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(path);
    
    if (data && data.length > 0) {
      const validFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder');
      
      if (validFiles.length > 0) {
        const filePaths = validFiles.map(f => `${path}/${f.name}`);
        
        const { data: signedUrls, error: signError } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrls(filePaths, 60, { download: true });

        if (signedUrls && !signError) {
          validFiles.forEach((fileObj, index) => {
            // FIX: Safely extract the URL and check if it is not null
            const generatedUrl = signedUrls[index]?.signedUrl;
            
            if (generatedUrl) {
              allFiles.push({ 
                folder: i, 
                name: fileObj.name, 
                url: generatedUrl 
              });
            }
          });
        }
      }
    }
  }
  return allFiles;
}

export async function deleteFile(pan: string, assessmentYear: string, folder: number, filename: string) {
  const filePath = `${pan}/${assessmentYear}/folder-${folder}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
  if (error) throw error;
  return true;
}
