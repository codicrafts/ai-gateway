import { NextRequest, NextResponse } from 'next/server';
import { createContactLead } from '@/services/contact/contact-lead.service';
import { sendContactLeadNotification } from '@/services/contact/contact-notification.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lead = await createContactLead({
      name: body?.name,
      email: body?.email,
      company: body?.company,
      inquiryType: body?.type,
      message: body?.message,
      locale: request.headers.get('accept-language')?.split(',')[0] || undefined,
    });

    let notificationSent = false;
    try {
      notificationSent = await sendContactLeadNotification(lead);
    } catch (notificationError) {
      console.error('发送联系线索通知失败', notificationError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        status: lead.status,
        notificationSent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交联系请求失败';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
