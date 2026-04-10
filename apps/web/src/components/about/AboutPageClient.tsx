"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { siteContactTeamMembers } from "@/config/site";

export default function AboutPageClient() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute top-0 inset-x-0 h-[520px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="mb-16 sm:mb-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_400px] lg:items-center">
            <div className="space-y-6 lg:pr-10">
              <span className="eyebrow inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <span className="text-primary font-medium tracking-wider">
                  {t.aboutPage.eyebrow}
                </span>
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-text-primary max-w-4xl">
                {t.aboutPage.title}
              </h1>
              <p className="text-lg leading-relaxed text-text-secondary max-w-3xl">
                {t.aboutPage.subtitle}
              </p>

              <div className="grid grid-cols-1 gap-5 pt-4 sm:grid-cols-3">
                {[
                  {
                    title: t.aboutPage.signal1Title,
                    desc: t.aboutPage.signal1Desc,
                  },
                  {
                    title: t.aboutPage.signal2Title,
                    desc: t.aboutPage.signal2Desc,
                  },
                  {
                    title: t.aboutPage.signal3Title,
                    desc: t.aboutPage.signal3Desc,
                  },
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className={`rounded-[2rem] border p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                      index === 1
                        ? "bg-primary/5 border-primary/20"
                        : "bg-white border-border"
                    }`}
                  >
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-3 inline-block bg-dark-light/50 px-2 py-1 rounded-md">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-text-primary">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <Link
                  href="/contact"
                  className="btn-primary btn-large justify-center no-underline rounded-full shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300"
                >
                  {t.aboutPage.contactCta}
                </Link>
                <Link
                  href="/docs"
                  className="btn-secondary btn-large justify-center no-underline rounded-full hover:-translate-y-0.5 transition-transform duration-300 bg-white/60 backdrop-blur-sm"
                >
                  {t.aboutPage.docsCta}
                </Link>
              </div>
            </div>

            <div className="editorial-panel p-6 sm:p-8 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-xl border-border">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {t.aboutPage.snapshot}
              </div>
              <div className="space-y-4">
                {[
                  t.aboutPage.snapshot1,
                  t.aboutPage.snapshot2,
                  t.aboutPage.snapshot3,
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/60 bg-dark-light/30 p-5 text-sm leading-relaxed text-text-secondary hover:bg-white hover:border-primary/20 transition-colors"
                  >
                    <div className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-2">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="text-text-primary font-medium">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 sm:mb-24 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[2.5rem] border border-border bg-white p-8 sm:p-10 shadow-sm">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-4">
              {t.aboutPage.storyLabel}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {t.aboutPage.storyTitle}
            </h2>
            <div className="mt-6 space-y-4 text-sm sm:text-base leading-relaxed text-text-secondary">
              <p>{t.aboutPage.storyBody1}</p>
              <p>{t.aboutPage.storyBody2}</p>
              <p>{t.aboutPage.storyBody3}</p>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-border bg-white p-8 sm:p-10 shadow-sm">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-text-secondary mb-4">
              {t.aboutPage.principlesLabel}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {t.aboutPage.principlesTitle}
            </h2>
            <ul className="mt-6 space-y-3">
              {[t.aboutPage.principle1, t.aboutPage.principle2, t.aboutPage.principle3].map(
                (item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/60 bg-dark-light/20 p-4 text-sm leading-relaxed text-text-primary"
                  >
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section className="mb-16 sm:mb-24">
          <div className="text-center mb-12">
            <span className="eyebrow inline-block bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 mb-4">
              {t.contact.aboutUs}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {t.aboutPage.valuesTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: "fa-bullseye",
                title: t.contact.mission,
                desc: t.contact.missionDesc,
              },
              {
                icon: "fa-eye",
                title: t.contact.vision,
                desc: t.contact.visionDesc,
              },
              {
                icon: "fa-heart",
                title: t.contact.values,
                desc: t.contact.valuesDesc,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-border rounded-[2.5rem] p-8 sm:p-10 text-center shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  <i className={`fas ${item.icon}`} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-4 text-text-primary">
                  {item.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">
              {t.aboutPage.teamTitle}
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto">
              {t.aboutPage.teamDesc}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteContactTeamMembers.map((member) => (
              <div
                key={member.email}
                className="bg-white border border-border rounded-[2rem] p-8 text-center shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-md">
                  {member.avatar}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-text-primary mb-1">
                  {member.name}
                </h3>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary mb-4 bg-primary/10 inline-block px-3 py-1 rounded-full">
                  {t.contact[member.roleKey]}
                </p>
                <p className="text-text-secondary text-sm leading-relaxed mb-6 h-12">
                  {t.contact[member.descriptionKey]}
                </p>
                <a
                  href={`mailto:${member.email}`}
                  className="inline-flex items-center justify-center btn-secondary rounded-full w-full py-2.5 no-underline hover:text-primary hover:border-primary/30 transition-colors"
                >
                  <i className="fas fa-envelope mr-2" />
                  {member.email}
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
