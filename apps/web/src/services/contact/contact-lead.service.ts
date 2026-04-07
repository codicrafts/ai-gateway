import { createServerAdminSupabaseClient, type Database } from '@/lib/supabase';

export type ContactLeadInput = {
  name: string;
  email: string;
  company?: string;
  inquiryType: 'sales' | 'support' | 'enterprise' | 'other';
  message: string;
  locale?: string;
};

export type ContactLeadRecord = Database['public']['Tables']['contact_leads']['Row'];

function normalizeText(value: string | null | undefined) {
  return (value || '').trim();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createContactLead(input: ContactLeadInput): Promise<ContactLeadRecord> {
  const name = normalizeText(input.name);
  const email = normalizeText(input.email).toLowerCase();
  const company = normalizeText(input.company);
  const message = normalizeText(input.message);

  if (!name) throw new Error('请输入姓名');
  if (!email || !validateEmail(email)) throw new Error('请输入有效的邮箱地址');
  if (!message || message.length < 10) throw new Error('请至少输入 10 个字符的需求说明');

  const supabase = createServerAdminSupabaseClient();
  const { data, error } = await supabase
    .from('contact_leads')
    .insert({
      name,
      email,
      company: company || null,
      inquiry_type: input.inquiryType,
      message,
      locale: input.locale || null,
      source: 'website_contact',
      metadata: {},
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '创建联系线索失败');
  }

  return data;
}
