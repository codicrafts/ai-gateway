'use client';

import { useState, useEffect } from 'react';
import { TeamRole } from '@ai-gateway/shared-types/team';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppSelector } from '@/store/hooks';

interface InviteModalProps {
  /** 弹窗是否打开 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 提交邀请回调 */
  onSubmit: (email: string, role: Exclude<TeamRole, 'owner'>) => void;
  /** 当前用户角色 */
  currentUserRole: TeamRole;
  /** 是否正在加载 */
  loading: boolean;
}

/**
 * 邀请成员弹窗组件
 * - 邮箱输入框，带格式验证
 * - 角色选择下拉框（根据当前用户角色限制可选项）
 *   - Owner 可选择 admin/member/guest
 *   - Admin 只能选择 member/guest
 * - 提交按钮和取消按钮
 * 
 * 需求: 4.1, 4.4, 4.5, 15.4
 */
export default function InviteModal({
  isOpen,
  onClose,
  onSubmit,
  currentUserRole,
  loading,
}: InviteModalProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const text = locale === 'zh'
    ? {
        title: '邀请成员',
        email: '邮箱地址',
        emailPlaceholder: '请输入被邀请者的邮箱',
        invalidEmail: '邮箱格式无效',
        emptyEmail: '请输入邮箱地址',
        role: '分配角色',
        flowHint: '可以邀请未注册用户，系统会生成一条可分享的邀请链接。',
        ownerHint: '作为 Owner，您可以邀请任意角色的成员',
        adminHint: '作为 Admin，您只能邀请 Member 或 Guest',
        roleAdmin: 'Admin - 管理员',
        roleMember: 'Member - 成员',
        roleGuest: 'Guest - 访客',
        roleAdminDesc: '可管理成员和团队设置',
        roleMemberDesc: '可使用团队资源',
        roleGuestDesc: '只能查看部分信息',
        cancel: '取消',
        sending: '发送中...',
        sendInvite: '发送邀请',
      }
    : {
        title: 'Invite Member',
        email: 'Email Address',
        emailPlaceholder: 'Enter the invitee email',
        invalidEmail: 'Invalid email format',
        emptyEmail: 'Please enter an email address',
        role: 'Assign Role',
        flowHint: 'You can invite people who have not registered yet. A shareable invitation link will be generated.',
        ownerHint: 'As Owner, you can invite members with any role',
        adminHint: 'As Admin, you can only invite Member or Guest',
        roleAdmin: 'Admin',
        roleMember: 'Member',
        roleGuest: 'Guest',
        roleAdminDesc: 'Can manage members and team settings',
        roleMemberDesc: 'Can use team resources',
        roleGuestDesc: 'Can only view limited information',
        cancel: 'Cancel',
        sending: 'Sending...',
        sendInvite: 'Send Invite',
      };
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('member');
  const [emailError, setEmailError] = useState<string | null>(null);

  // 重置表单状态
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('member');
      setEmailError(null);
    }
  }, [isOpen]);

  // 获取可选角色列表
  const getAvailableRoles = (): { value: Exclude<TeamRole, 'owner'>; label: string }[] => {
    if (currentUserRole === 'owner') {
      return [
        { value: 'admin', label: text.roleAdmin },
        { value: 'member', label: text.roleMember },
        { value: 'guest', label: text.roleGuest },
      ];
    }
    // Admin 只能邀请 member 或 guest
    return [
      { value: 'member', label: text.roleMember },
      { value: 'guest', label: text.roleGuest },
    ];
  };

  // 验证邮箱格式
  const validateEmail = (value: string): boolean => {
    if (!value || value.trim().length === 0) {
      setEmailError(text.emptyEmail);
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError(text.invalidEmail);
      return false;
    }
    setEmailError(null);
    return true;
  };

  // 处理邮箱输入变化
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      return;
    }
    onSubmit(email.trim(), role);
  };

  // 处理关闭
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // 处理背景点击
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const availableRoles = getAvailableRoles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-dark border border-border rounded-xl w-full max-w-md mx-4 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-user-plus text-primary" />
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
          {/* 邮箱输入 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {text.email} <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => email && validateEmail(email)}
                placeholder={text.emailPlaceholder}
                disabled={loading}
                className={`w-full pl-10 pr-4 py-2.5 bg-dark border rounded-lg text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                  emailError
                    ? 'border-error focus:border-error'
                    : 'border-border focus:border-primary'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-error flex items-center gap-1">
                <i className="fas fa-exclamation-circle" />
                {emailError}
              </p>
            )}
          </div>

          {/* 角色选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {text.role} <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i className="fas fa-user-tag absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-secondary" />
              <EditorialSelect
                value={role}
                onChange={(value) => setRole(value as Exclude<TeamRole, 'owner'>)}
                disabled={loading}
                options={availableRoles}
                buttonClassName="pl-10 bg-dark"
                menuClassName="z-[10000]"
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {currentUserRole === 'owner'
                ? text.ownerHint
                : text.adminHint}
            </p>
          </div>

          {/* 角色说明 */}
          <div className="bg-border/30 rounded-lg p-3 text-xs text-text-secondary space-y-1">
            <p>{text.flowHint}</p>
            <p><strong className="text-warning">Admin</strong>: {text.roleAdminDesc}</p>
            <p><strong className="text-success">Member</strong>: {text.roleMemberDesc}</p>
            <p><strong className="text-secondary">Guest</strong>: {text.roleGuestDesc}</p>
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
              disabled={loading || !email.trim()}
              className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" />
                  {text.sending}
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" />
                  {text.sendInvite}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
