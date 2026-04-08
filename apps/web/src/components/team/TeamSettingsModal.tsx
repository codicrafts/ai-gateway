'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Team, UpdateTeamRequest } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateTeamRequest) => Promise<void> | void;
  team: Team;
  loading: boolean;
}

export default function TeamSettingsModal({
  isOpen,
  onClose,
  onSubmit,
  team,
  loading,
}: TeamSettingsModalProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const isZh = locale === 'zh';
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [website, setWebsite] = useState('');
  const [brandColor, setBrandColor] = useState('#A94B2B');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(team.name || '');
    setDescription(team.description || '');
    setSlug(team.slug || '');
    setWebsite(team.website || '');
    setBrandColor(team.brand_color || '#A94B2B');
    setLogoPreview(team.logo || null);
    setLogoFile(null);
    setErrorMessage(null);
  }, [isOpen, team]);

  useEffect(() => {
    if (!logoFile) return undefined;
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  const logoAlt = useMemo(() => `${name || team.name} logo`, [name, team.name]);

  const validate = () => {
    if (name.trim().length < 2) {
      setErrorMessage(tr('团队名称至少需要 2 个字符', 'Team name must be at least 2 characters'));
      return false;
    }
    if (slug.trim().length < 3) {
      setErrorMessage(tr('团队 slug 至少需要 3 个字符', 'Team slug must be at least 3 characters'));
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(slug.trim())) {
      setErrorMessage(tr('团队 slug 仅支持小写字母、数字和连字符', 'Team slug only supports lowercase letters, numbers, and hyphens'));
      return false;
    }
    if (website.trim().length > 0) {
      try {
        const parsed = new URL(website.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
      } catch {
        setErrorMessage(tr('团队站点地址无效', 'Team website is invalid'));
        return false;
      }
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(brandColor.trim())) {
      setErrorMessage(tr('品牌色必须是 6 位十六进制颜色值', 'Brand color must be a 6-digit hex color'));
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      let uploadedLogo = team.logo || undefined;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        const uploadResponse = await fetch(`/api/teams/${team.id}/logo`, {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success || !uploadResult.data?.logo) {
          throw new Error(uploadResult.error || tr('上传团队 Logo 失败', 'Failed to upload team logo'));
        }
        uploadedLogo = uploadResult.data.logo;
      }

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        slug: slug.trim().toLowerCase(),
        website: website.trim() || undefined,
        brand_color: brandColor.trim(),
        logo: uploadedLogo || undefined,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tr('保存团队设置失败', 'Failed to save team settings'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const busy = loading || submitting;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-3 py-6 sm:px-4 sm:py-8 backdrop-blur-sm" onClick={busy ? undefined : onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] border border-border bg-[rgba(255,250,244,0.98)] shadow-[0_36px_90px_rgba(35,26,18,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(169,75,43,0.12),rgba(255,248,238,0.84)_54%,rgba(33,93,89,0.08))] px-4 py-4 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <div className="eyebrow">{tr('团队品牌资料', 'Team Branding')}</div>
              <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl md:text-2xl font-semibold">{tr('编辑团队资料与品牌识别', 'Edit team profile and branding')}</h3>
              <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm leading-5 sm:leading-6 md:leading-7 text-text-secondary">
                {tr('团队名称、slug、品牌色、官网和 Logo 会同时影响组织工作区与邀请落点。', 'Team name, slug, brand color, website, and logo affect both the workspace and invite landing points.')}
              </p>
            </div>
            <button type="button" onClick={busy ? undefined : onClose} className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-border bg-white/80 text-text-secondary transition-colors hover:text-text-primary flex-shrink-0">
              <i className="fas fa-times text-sm sm:text-base" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6 px-4 py-4 sm:px-6 sm:py-6 md:px-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-lg sm:rounded-xl md:rounded-[1.5rem] border border-border bg-white/80 p-4 sm:p-5">
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('团队标识', 'Brand Mark')}</div>
              <div className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4">
                <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-lg sm:rounded-xl md:rounded-[1.5rem] border border-border bg-[rgba(169,75,43,0.12)]">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt={logoAlt} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-semibold" style={{ color: brandColor }}>{(name || team.name || 'T').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-semibold">{name || team.name}</div>
                  <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-text-secondary">{slug || team.slug}</div>
                  <label className="mt-2 sm:mt-3 inline-flex cursor-pointer items-center rounded-full border border-border bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-text-primary transition hover:border-primary hover:text-primary">
                    <i className="fas fa-upload mr-1.5 sm:mr-2 text-xs sm:text-sm" />
                    {tr('上传 Logo', 'Upload Logo')}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setLogoFile(nextFile);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg sm:rounded-xl md:rounded-[1.5rem] border border-border bg-white/80 p-4 sm:p-5">
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.18em] text-text-secondary">{tr('品牌色', 'Brand Color')}</div>
              <div className="mt-3 sm:mt-4 flex items-center gap-2.5 sm:gap-3">
                <input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} className="h-10 w-14 sm:h-12 sm:w-16 cursor-pointer rounded-lg sm:rounded-xl border border-border bg-transparent p-1" />
                <input type="text" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} className="form-control font-mono uppercase text-xs sm:text-sm" />
              </div>
              <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border border-border bg-white/80 p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-medium">{tr('预览', 'Preview')}</div>
                <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brandColor }} />
                  <span className="text-xs sm:text-sm text-text-secondary">{tr('该颜色会用于团队品牌标识和部分辅助强调', 'This color is used for team brand accents and identity')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm text-text-secondary">{tr('团队名称', 'Team Name')}</label>
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} className="form-control text-sm sm:text-base" maxLength={100} />
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm text-text-secondary">{tr('团队 slug', 'Team Slug')}</label>
                <input type="text" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} className="form-control font-mono text-sm sm:text-base" placeholder="acme-platform" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm text-text-secondary">{tr('团队简介', 'Description')}</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="form-control min-h-[100px] sm:min-h-[120px] text-sm sm:text-base" placeholder={tr('用于说明团队业务边界、使用场景或交付背景。', 'Describe the team scope, use case, or delivery context.')} />
            </div>

            <div>
              <label className="mb-1.5 sm:mb-2 block text-xs sm:text-sm text-text-secondary">{tr('团队网站', 'Team Website')}</label>
              <input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className="form-control text-sm sm:text-base" placeholder="https://example.com" />
            </div>

            {errorMessage && (
              <div className="rounded-lg sm:rounded-xl border border-danger/30 bg-danger/8 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-danger">
                <i className="fas fa-circle-exclamation mr-1.5 sm:mr-2" />
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-end gap-2 sm:gap-3 border-t border-border pt-3 sm:pt-4">
              <button type="button" onClick={busy ? undefined : onClose} className="btn-secondary px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm w-full sm:w-auto justify-center">
                {tr('取消', 'Cancel')}
              </button>
              <button type="submit" disabled={busy} className="btn-primary px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm disabled:opacity-50 w-full sm:w-auto justify-center">
                <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-save'} mr-1.5 sm:mr-2`} />
                {busy ? tr('保存中', 'Saving') : tr('保存团队资料', 'Save Team Profile')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
