'use client';

import { useState } from 'react';
import { CreateTeamRequest } from '@ai-gateway/shared-types/team';
import { useAppSelector } from '@/store/hooks';

interface CreateTeamModalProps {
  /** 弹窗是否打开 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 提交创建回调 */
  onSubmit: (data: CreateTeamRequest) => void;
  /** 是否正在加载 */
  loading: boolean;
}

/**
 * 创建团队弹窗组件
 * - 输入团队名称、描述、Logo（可选）
 * - 表单验证（名称长度 2-100）
 * 
 * 需求: 1.1, 1.2, 1.3, 1.5
 */
export default function CreateTeamModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: CreateTeamModalProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const text = locale === 'zh'
    ? {
        title: '创建团队',
        name: '团队名称',
        description: '团队描述',
        namePlaceholder: '请输入团队名称',
        descriptionPlaceholder: '请输入团队描述（可选）',
        logoPlaceholder: '请输入 Logo 图片 URL（可选）',
        logoPreview: 'Logo 预览',
        emptyName: '团队名称不能为空',
        minName: '团队名称至少需要 2 个字符',
        maxName: '团队名称不能超过 100 个字符',
        cancel: '取消',
        creating: '创建中...',
        create: '创建团队',
      }
    : {
        title: 'Create Team',
        name: 'Team Name',
        description: 'Team Description',
        namePlaceholder: 'Enter team name',
        descriptionPlaceholder: 'Enter team description (optional)',
        logoPlaceholder: 'Enter logo image URL (optional)',
        logoPreview: 'Logo Preview',
        emptyName: 'Team name is required',
        minName: 'Team name must be at least 2 characters',
        maxName: 'Team name cannot exceed 100 characters',
        cancel: 'Cancel',
        creating: 'Creating...',
        create: 'Create Team',
      };
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // 验证团队名称（2-100 字符）
  const validateName = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length === 0) {
      setNameError(text.emptyName);
      return false;
    }
    if (trimmed.length < 2) {
      setNameError(text.minName);
      return false;
    }
    if (trimmed.length > 100) {
      setNameError(text.maxName);
      return false;
    }
    setNameError(null);
    return true;
  };

  // 处理名称输入变化
  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      validateName(value);
    }
  };

  // 重置表单
  const resetForm = () => {
    setName('');
    setDescription('');
    setLogo('');
    setNameError(null);
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName(name)) {
      return;
    }

    const createData: CreateTeamRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      logo: logo.trim() || undefined,
    };

    onSubmit(createData);
  };

  // 处理关闭
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  // 处理背景点击
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-dark border border-border rounded-xl w-full max-w-md mx-4 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-plus-circle text-primary" />
            {text.title}
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 团队名称输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {text.name} <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i className="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => name && validateName(name)}
                placeholder={text.namePlaceholder}
                disabled={loading}
                maxLength={100}
                className={`w-full pl-10 pr-4 py-2.5 bg-dark border rounded-lg text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                  nameError
                    ? 'border-error focus:border-error'
                    : 'border-border focus:border-primary'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1">
              {nameError ? (
                <p className="text-xs text-error flex items-center gap-1">
                  <i className="fas fa-exclamation-circle" />
                  {nameError}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-text-secondary">
                {name.trim().length}/100
              </p>
            </div>
          </div>

          {/* 团队描述输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {text.description}
            </label>
            <div className="relative">
              <i className="fas fa-align-left absolute left-3 top-3 text-text-secondary" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={text.descriptionPlaceholder}
                disabled={loading}
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          {/* Logo URL 输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Logo URL
            </label>
            <div className="relative">
              <i className="fas fa-image absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="url"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder={text.logoPlaceholder}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-dark border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>
            {logo && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border border-border overflow-hidden bg-border/30 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt={text.logoPreview}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-xs text-text-secondary">{text.logoPreview}</span>
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
            className="flex-1 py-2.5 px-4 border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors disabled:opacity-50"
          >
            {text.cancel}
          </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" />
                  {text.creating}
                </>
              ) : (
                <>
                  <i className="fas fa-plus" />
                  {text.create}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
