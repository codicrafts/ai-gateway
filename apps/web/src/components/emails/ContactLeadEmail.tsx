import { BaseEmailLayout } from '@/components/emails/BaseEmailLayout';
import type { ContactLeadRecord } from '@/services/contact/contact-lead.service';

type ContactLeadEmailProps = {
  lead: ContactLeadRecord;
};

export function ContactLeadEmail({ lead }: ContactLeadEmailProps) {
  return (
    <BaseEmailLayout
      title="New website contact lead"
      preview={`${lead.name} submitted a ${lead.inquiry_type} inquiry`}
      footer={`Lead ID: ${lead.id}`}
    >
      <h2 style={{ marginBottom: '12px' }}>New website contact lead</h2>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Name:</strong> {lead.name}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Email:</strong> {lead.email}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Company:</strong> {lead.company || '-'}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Inquiry type:</strong> {lead.inquiry_type}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Locale:</strong> {lead.locale || '-'}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        <strong>Lead ID:</strong> {lead.id}
      </p>
      <p style={{ margin: '16px 0 8px' }}>
        <strong>Message</strong>
      </p>
      <div
        style={{
          padding: '12px 14px',
          border: '1px solid #e5d2c4',
          borderRadius: '12px',
          background: '#fff8f0',
          whiteSpace: 'pre-wrap',
        }}
      >
        {lead.message}
      </div>
    </BaseEmailLayout>
  );
}
