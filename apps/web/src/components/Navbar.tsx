"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useTranslation } from "@/hooks/useTranslation";
import { logoutUser } from "@/lib/logout";
import LanguageSwitcher from "./LanguageSwitcher";

interface NavbarProps {
  variant?: "default" | "dashboard";
}

export default function Navbar({ variant = "default" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    isLoggedIn,
    currentUser,
    loading: authLoading,
  } = useAppSelector((s) => s.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      dispatch(logout());
      router.push("/");
      router.refresh();
    }
  };

  const effectiveLoggedIn = isLoggedIn;
  const displayIdentity = (() => {
    const nickname = currentUser?.name?.trim();
    if (nickname) {
      return nickname;
    }

    const username = currentUser?.username?.trim();
    if (username) {
      return username;
    }

    const email = currentUser?.email?.trim();
    if (email) {
      return email;
    }

    return currentUser?.phone?.trim() || null;
  })();
  const authUiLoading = authLoading && !isLoggedIn;

  const defaultLinks = [
    { href: "/", label: t.nav.home },
    { href: "/models", label: t.nav.models },
    { href: "/docs", label: t.nav.docs },
    { href: "/playground", label: t.nav.playground },
    { href: "/pricing", label: t.nav.pricing },
  ];

  const dashboardLinks = [
    { href: "/", label: t.nav.home },
    { href: "/dashboard", label: t.nav.dashboard },
    { href: "/models", label: t.nav.models },
    { href: "/docs", label: t.nav.docs },
    { href: "/playground", label: t.nav.playground },
  ];

  const links = variant === "dashboard" ? dashboardLinks : defaultLinks;

  return (
    <nav className="sticky top-0 z-[1000] border-b border-border/80 bg-[#f9f2e6]/85 backdrop-blur-xl">
      <div className="section-shell">
        <div className="flex justify-between items-center py-3 sm:py-4">
          <Link
            href="/"
            className="group flex items-center gap-3 text-xl sm:text-2xl no-underline text-text-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-text-primary bg-text-primary text-dark-light transition-transform duration-300 group-hover:rotate-12">
              <i className="fas fa-compass text-base" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.62rem] uppercase tracking-[0.28em] text-text-secondary mb-1">
                {t.brand.bureau}
              </span>
              <span className="font-serif text-[1.35rem] sm:text-[1.6rem] italic tracking-[-0.04em]">
                {t.brand.name}
              </span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-border/80 bg-white/70 p-2 shadow-soft">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors no-underline ${
                  pathname === link.href
                    ? "bg-text-primary text-dark-light"
                    : "text-text-secondary hover:bg-dark hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex gap-3 items-center">
            <LanguageSwitcher />
            {authUiLoading ? (
              <div className="h-10 w-36 rounded-full border border-border/80 bg-white/60" />
            ) : variant === "dashboard" && effectiveLoggedIn ? (
              <>
                {displayIdentity ? (
                  <span className="text-text-secondary mr-2 hidden lg:inline text-sm uppercase tracking-[0.08em]">
                    {displayIdentity}
                  </span>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  <i className="fas fa-sign-out-alt" />{" "}
                  <span className="hidden sm:inline">{t.nav.logout}</span>
                </button>
              </>
            ) : effectiveLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="btn-secondary no-underline text-sm py-2 px-4"
                >
                  <i className="fas fa-tachometer-alt" />{" "}
                  <span className="hidden sm:inline">{t.nav.dashboard}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  <i className="fas fa-sign-out-alt" />{" "}
                  <span className="hidden sm:inline">{t.nav.logout}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-secondary no-underline text-sm py-2 px-4"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/login"
                  className="btn-primary no-underline text-sm py-2 px-4"
                >
                  {t.nav.register}
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <i
              className={`fas ${mobileMenuOpen ? "fa-times" : "fa-bars"} text-xl`}
            />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 animate-slide-down">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-3 px-4 rounded-[1rem] transition-colors no-underline ${
                    pathname === link.href
                      ? "bg-text-primary text-dark-light"
                      : "text-text-secondary hover:bg-dark hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="py-3 px-4">
                <LanguageSwitcher />
              </div>
              <div className="border-t border-border mt-2 pt-4 flex flex-col gap-2">
                {authUiLoading ? (
                  <div className="h-10 rounded-[1rem] border border-border/80 bg-white/60" />
                ) : variant === "dashboard" && effectiveLoggedIn ? (
                  <>
                    {displayIdentity ? (
                      <span className="text-text-secondary px-4 text-sm">
                        {displayIdentity}
                      </span>
                    ) : null}
                    <button
                      onClick={handleLogout}
                      className="btn-secondary justify-center"
                    >
                      <i className="fas fa-sign-out-alt" /> {t.nav.logout}
                    </button>
                  </>
                ) : effectiveLoggedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="btn-secondary no-underline justify-center"
                    >
                      <i className="fas fa-tachometer-alt" /> {t.nav.dashboard}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="btn-secondary justify-center"
                    >
                      <i className="fas fa-sign-out-alt" /> {t.nav.logout}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="btn-secondary no-underline justify-center"
                    >
                      {t.nav.login}
                    </Link>
                    <Link
                      href="/login"
                      className="btn-primary no-underline justify-center"
                    >
                      {t.nav.register}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
