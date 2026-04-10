'use client';

import Link from 'next/link';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { siteContactChannels, siteContactTeamMembers } from '@/config/site';
import { useAppDispatch } from '@/store/hooks';
import { showNotification } from '@/store/slices/notificationSlice';
import { useTranslation } from '@/hooks/useTranslation';

const INQUIRY_OPTIONS = ['sales', 'support', 'enterprise', 'other'] as const;

export default function ContactPageClient() {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({ name: '', email: '', company: '', type: 'sales', message: '' });
  const [loading, setLoading] = useState(false);
  const t = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || t.contact.submitError);
      }

      dispatch(showNotification({ message: t.contact.submitSuccess }));
      setFormData({ name: '', email: '', company: '', type: 'sales', message: '' });
    } catch (error) {
      dispatch(
        showNotification({
          message: error instanceof Error ? error.message : t.contact.submitError,
          type: 'error',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="mb-16 sm:mb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_380px] lg:items-center">
            <div className="space-y-6 lg:pr-8">
              <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">{t.contact.eyebrow}</span>
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-text-primary max-w-3xl">
                {t.contact.title}
              </h1>
              <p className="text-lg leading-relaxed text-text-secondary max-w-2xl">
                {t.contact.subtitle}
              </p>

              <div className="grid grid-cols-1 gap-5 pt-6 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { title: t.contact.path1Title, desc: t.contact.path1Desc },
                  { title: t.contact.path2Title, desc: t.contact.path2Desc },
                  { title: t.contact.path3Title, desc: t.contact.path3Desc },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className={`rounded-[2rem] border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                      index === 2
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-white border-border'
                    }`}
                  >
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-3 inline-block bg-dark-light/50 px-2 py-1 rounded-md">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-text-primary">{item.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="editorial-panel p-6 sm:p-8 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl border-border lg:justify-self-end w-full">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                {t.contact.responseTitle}
              </div>
              <div className="space-y-4">
                {[t.contact.response1, t.contact.response2, t.contact.response3].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-border/60 bg-dark-light/30 p-5 text-sm leading-relaxed text-text-secondary hover:bg-white hover:border-primary/20 transition-colors">
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-2">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="text-text-primary font-medium">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-16 sm:mb-24 bg-white/60 p-6 sm:p-10 rounded-[2.5rem] border border-border shadow-sm backdrop-blur-sm">
          <div className="editorial-panel p-6 sm:p-10 rounded-[2rem] bg-white border-border shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 text-text-primary">{t.contact.sendMessage}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-2">{t.contact.name} <span className="text-danger">*</span></label>
                  <input type="text" className="form-control rounded-xl bg-dark-light/10 focus:bg-white transition-colors" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-2">{t.contact.email} <span className="text-danger">*</span></label>
                  <input type="email" className="form-control rounded-xl bg-dark-light/10 focus:bg-white transition-colors" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-2">{t.contact.company}</label>
                  <input type="text" className="form-control rounded-xl bg-dark-light/10 focus:bg-white transition-colors" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} placeholder={t.contact.companyPlaceholder} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-2">{t.contact.inquiryType}</label>
                  <EditorialSelect className="rounded-xl bg-dark-light/10" value={formData.type} onChange={(value) => setFormData({ ...formData, type: value })} options={INQUIRY_OPTIONS.map((value) => ({ value, label: t.contact[value] }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-2">{t.contact.message} <span className="text-danger">*</span></label>
                <textarea className="form-control rounded-xl bg-dark-light/10 focus:bg-white transition-colors" rows={5} required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder={t.contact.messagePlaceholder} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center rounded-full py-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-base font-semibold" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin mr-2" />{t.contact.submitting}</> : <><i className="fas fa-paper-plane mr-2" />{t.contact.submit}</>}
              </button>
            </form>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="editorial-panel p-6 sm:p-10 rounded-[2rem] bg-white border-border shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight mb-8 text-text-primary">{t.contact.contactInfo}</h2>
              <div className="space-y-6">
                {siteContactChannels.map((item) => (
                  <a key={item.label} href={item.href} className="flex items-center gap-5 text-text-secondary hover:text-primary transition-colors no-underline group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <i className={`fas ${item.icon} text-lg`} />
                    </div>
                    <div>
                      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-text-secondary mb-1">{t.contact[`${item.label}Label` as 'emailLabel']}</div>
                      <div className="text-text-primary font-medium text-lg">{item.value}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="editorial-panel p-6 sm:p-10 rounded-[2rem] bg-white border-border shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight mb-6 text-text-primary">{t.contact.enterpriseServices}</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{ icon: 'fa-headset', text: t.contact.service247 }, { icon: 'fa-file-contract', text: t.contact.sla }, { icon: 'fa-server', text: t.contact.privateDeploy }, { icon: 'fa-user-tie', text: t.contact.accountManager }, { icon: 'fa-receipt', text: t.contact.invoice }].map((item) => (
                  <li key={item.text} className="flex items-center gap-3 text-text-secondary text-sm bg-dark-light/20 p-3 rounded-xl border border-border/50">
                    <i className={`fas ${item.icon} text-primary/80`} />
                    <span className="font-medium text-text-primary">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">{t.contact.getInTouch}</h2>
            <p className="text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto">{t.contact.getInTouchDesc}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteContactTeamMembers.map((member) => (
              <div key={member.email} className="bg-white border border-border rounded-[2rem] p-8 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-md">
                  {member.avatar}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-text-primary mb-1">{member.name}</h3>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary mb-4 bg-primary/10 inline-block px-3 py-1 rounded-full">{t.contact[member.roleKey]}</p>
                <p className="text-text-secondary text-sm leading-relaxed mb-6 h-12">{t.contact[member.descriptionKey]}</p>
                <a href={`mailto:${member.email}`} className="inline-flex items-center justify-center btn-secondary rounded-full w-full py-2.5 no-underline hover:text-primary hover:border-primary/30 transition-colors">
                  <i className="fas fa-envelope mr-2" />{member.email}
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-[2.5rem] border border-border bg-white/75 p-8 sm:p-10 shadow-sm backdrop-blur-sm">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <span className="eyebrow inline-block bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 mb-4">{t.contact.aboutUs}</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">{t.contact.aboutCtaTitle}</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">{t.contact.aboutCtaDesc}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/about" className="btn-primary btn-large justify-center no-underline rounded-full">
                {t.contact.aboutCtaPrimary}
              </Link>
              <Link href="/docs" className="btn-secondary btn-large justify-center no-underline rounded-full">
                {t.contact.aboutCtaSecondary}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
