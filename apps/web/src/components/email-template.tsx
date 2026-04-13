import * as React from 'react';

type EmailTemplateProps = {
  firstName: string;
};

export function EmailTemplate({ firstName }: EmailTemplateProps) {
  return (
    <div>
      <h1>Welcome, {firstName}!</h1>
    </div>
  );
}
