import { createServerAdminSupabaseClient } from '@/lib/supabase';

const TEAM_ASSETS_BUCKET = process.env.SUPABASE_TEAM_ASSETS_BUCKET || 'team-assets';

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

export async function uploadTeamLogo(params: {
  teamId: string;
  file: File;
}): Promise<{ logo: string; logo_path: string }> {
  const supabase = createServerAdminSupabaseClient();
  const arrayBuffer = await params.file.arrayBuffer();
  const fileName = sanitizeFileName(params.file.name || 'logo.png');
  const storagePath = `teams/${params.teamId}/${Date.now()}-${fileName}`;

  const { data: existingTeam } = await supabase
    .from('teams')
    .select('logo_path')
    .eq('id', params.teamId)
    .single();

  const { error: uploadError } = await supabase.storage
    .from(TEAM_ASSETS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: params.file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`上传团队 Logo 失败: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(TEAM_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  const { error: updateError } = await supabase
    .from('teams')
    .update({
      logo_path: storagePath,
      logo: publicUrlData.publicUrl,
    } as never)
    .eq('id', params.teamId);

  if (updateError) {
    throw new Error('保存团队 Logo 失败');
  }

  if (existingTeam?.logo_path) {
    await supabase.storage.from(TEAM_ASSETS_BUCKET).remove([existingTeam.logo_path]);
  }

  return {
    logo: publicUrlData.publicUrl,
    logo_path: storagePath,
  };
}
