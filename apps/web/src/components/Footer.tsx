import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function Footer() {
  const t = useTranslation();

  return (
    <footer className="border-t border-border/80 bg-[#201815] pt-16 pb-6 text-[#f3e5d1]">
      <div className="section-shell">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
          <div className="max-w-sm">
            <div className="mb-4 text-[0.7rem] uppercase tracking-[0.28em] text-[#d7bea1]">{t.brand.bureau}</div>
            <div className="font-serif text-4xl italic tracking-[-0.05em]">{t.brand.name}</div>
            <p className="mt-4 text-sm leading-7 text-[#d9c7b2]">{t.footer.summary}</p>
          </div>
          <div>
            <h4 className="mb-4 text-[0.76rem] uppercase tracking-[0.22em] text-[#d7bea1]">{t.footer.product}</h4>
            <Link href="/models" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.nav.models}</Link>
            <Link href="/pricing" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.nav.pricing}</Link>
            <Link href="/playground" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.footer.playground}</Link>
            <Link href="/docs" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.footer.apiDocs}</Link>
          </div>
          <div>
            <h4 className="mb-4 text-[0.76rem] uppercase tracking-[0.22em] text-[#d7bea1]">{t.footer.company}</h4>
            <Link href="/about" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.footer.about}</Link>
            <Link href="/contact" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.nav.contact}</Link>
          </div>
          <div>
            <h4 className="mb-4 text-[0.76rem] uppercase tracking-[0.22em] text-[#d7bea1]">{t.footer.legal}</h4>
            <Link href="/privacy" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.footer.privacy}</Link>
            <Link href="/terms" className="mb-3 block text-[#f3e5d1] hover:text-white no-underline">{t.footer.terms}</Link>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/10 pt-8">
          <p className="text-sm uppercase tracking-[0.14em] text-[#d7bea1]">{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
