'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageClientProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
};

export default function LegalPageClient({
  eyebrow,
  title,
  subtitle,
  updatedAt,
  sections,
}: LegalPageClientProps) {
  return (
    <div className="min-h-screen overflow-hidden">
      <Navbar />
      <main className="py-10 sm:py-14">
        <div className="section-shell">
          <div className="editorial-panel p-6 sm:p-10">
            <div className="max-w-3xl">
              <span className="eyebrow">{eyebrow}</span>
              <h1 className="mt-5 text-[2.2rem] leading-tight sm:text-[3rem]">{title}</h1>
              <p className="mt-4 text-base leading-7 text-text-secondary sm:text-lg">{subtitle}</p>
              <p className="mt-4 text-sm uppercase tracking-[0.16em] text-text-secondary">
                最近更新 {updatedAt}
              </p>
            </div>

            <div className="mt-10 grid gap-6">
              {sections.map((section) => (
                <section key={section.title} className="rounded-[1.75rem] border border-border bg-white/70 p-5 sm:p-7">
                  <h2 className="text-xl font-semibold sm:text-2xl">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary sm:text-base">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
