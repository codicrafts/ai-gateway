type EmailButtonProps = {
  href: string;
  children: string;
};

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        background: '#b8572b',
        color: '#fff',
        textDecoration: 'none',
        padding: '12px 20px',
        borderRadius: '999px',
        fontWeight: 600,
      }}
    >
      {children}
    </a>
  );
}
