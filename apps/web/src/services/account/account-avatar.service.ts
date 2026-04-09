import { createServerAdminSupabaseClient } from '@/lib/supabase';

const TEAM_ASSETS_BUCKET = process.env.SUPABASE_TEAM_ASSETS_BUCKET || 'team-assets';

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

export async function uploadAccountAvatar(params: {
  userId: string;
  file: File;
}): Promise<{ image: string }> {
  const supabase = createServerAdminSupabaseClient();
  const arrayBuffer = await params.file.arrayBuffer();
  const fileName = sanitizeFileName(params.file.name || 'avatar.png');
  const storagePath = `users/${params.userId}/${Date.now()}-${fileName}`;

  const { data: existingFiles, error: listError } = await supabase.storage
    .from(TEAM_ASSETS_BUCKET)
    .list(`users/${params.userId}`, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (listError) {
    throw new Error(`读取现有头像失败: ${listError.message}`);
  }

  if (existingFiles && existingFiles.length > 0) {
    await supabase.storage
      .from(TEAM_ASSETS_BUCKET)
      .remove(existingFiles.map((file) => `users/${params.userId}/${file.name}`));
  }

  const { error: uploadError } = await supabase.storage
    .from(TEAM_ASSETS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: params.file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`上传头像失败: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(TEAM_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    image: publicUrlData.publicUrl,
  };
}
