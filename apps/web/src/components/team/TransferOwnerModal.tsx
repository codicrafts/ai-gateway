'use client';

import { useState, useEffect } from 'react';
import { TeamMember } from '@ai-gateway/shared-types/team';
import EditorialSelect from '@/components/ui/EditorialSelect';
import { useAppSelector } from '@/store/hooks';

interface TransferOwnerModalProps {
  /** 弹窗是否打开 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 提交转让回调 */
  onSubmit: (newOwnerId: string) => void;
  /** 可选择的成员列表（排除当前 Owner） */
  members: TeamMember[];
  /** 是否正在加载 */
  loading: boolean;
}

/**
 * 所有权转让弹窗组件
 * - 成员选择下拉框（显示用户名和邮箱）
 * - 警告提示（转让后您将降级为 Admin）
 * - 二次确认复选框
 * - 提交按钮和取消按钮
 * 
 * 需求: 7.1, 7.3
 */
export default function TransferOwnerModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  loading,
}: TransferOwnerModalProps) {
  const locale = useAppSelector((state) => state.locale.locale);
  const text = locale === 'zh'
    ? {
        title: '转让所有权',
        warningTitle: '重要提示',
        warningBody: '转让所有权后，您将降级为 Admin 角色，新 Owner 将拥有团队的最高管理权限。此操作不可撤销。',
        selectNewOwner: '选择新 Owner',
        selectMember: '请选择成员',
        unknownUser: '未知用户',
        noEmail: '无邮箱',
        noCandidates: '团队中没有其他成员可以转让所有权',
        transferTo: '即将转让给：',
        currentRole: '当前',
        selectedMember: '选中的成员',
        confirmTemplateStart: '我确认要将团队所有权转让给 ',
        confirmTemplateEnd: '，并理解此操作不可撤销。',
        cancel: '取消',
        transferring: '转让中...',
        confirmTransfer: '确认转让',
      }
    : {
        title: 'Transfer Ownership',
        warningTitle: 'Important',
        warningBody: 'After transfer, you will be downgraded to Admin and the new Owner will have the highest team privileges. This action cannot be undone.',
        selectNewOwner: 'Select New Owner',
        selectMember: 'Select a member',
        unknownUser: 'Unknown User',
        noEmail: 'No email',
        noCandidates: 'No other members are available to transfer ownership to',
        transferTo: 'Ownership will be transferred to:',
        currentRole: 'Current',
        selectedMember: 'selected member',
        confirmTemplateStart: 'I confirm that I want to transfer team ownership to ',
        confirmTemplateEnd: ' and understand this action cannot be undone.',
        cancel: 'Cancel',
        transferring: 'Transferring...',
        confirmTransfer: 'Confirm Transfer',
      };
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);

  // 重置表单状态
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId('');
      setConfirmed(false);
    }
  }, [isOpen]);

  // 获取选中的成员信息
  const selectedMember = members.find((m) => m.user_id === selectedMemberId);

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !confirmed) {
      return;
    }
    onSubmit(selectedMemberId);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-dark border border-border rounded-xl w-full max-w-md mx-4 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <i className="fas fa-exchange-alt text-warning" />
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
          {/* 警告提示 */}
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <i className="fas fa-exclamation-triangle text-warning mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">{text.warningTitle}</p>
                <p className="text-text-secondary mt-1">
                  {text.warningBody}
                </p>
              </div>
            </div>
          </div>

          {/* 成员选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {text.selectNewOwner} <span className="text-error">*</span>
            </label>
            <div className="relative">
              <i className="fas fa-user-crown absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-text-secondary" />
              <EditorialSelect
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                disabled={loading || members.length === 0}
                placeholder={text.selectMember}
                options={[
                  { value: '', label: text.selectMember },
                  ...members.map((member) => ({
                    value: member.user_id,
                    label: `${member.user?.username || text.unknownUser} (${member.user?.email || text.noEmail}) - ${member.role}`,
                  })),
                ]}
                buttonClassName="pl-10 bg-dark"
                menuClassName="z-[10000]"
              />
            </div>
            {members.length === 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                {text.noCandidates}
              </p>
            )}
          </div>

          {/* 选中成员信息 */}
          {selectedMember && (
            <div className="bg-border/30 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">{text.transferTo}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <i className="fas fa-user text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedMember.user?.username || text.unknownUser}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {selectedMember.user?.email || text.noEmail}
                  </p>
                </div>
                <span className="ml-auto px-2 py-1 text-xs rounded-full bg-border text-text-secondary">
                  {text.currentRole}: {selectedMember.role}
                </span>
              </div>
            </div>
          )}

          {/* 二次确认复选框 */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="confirm-transfer"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading || !selectedMemberId}
              className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 bg-dark disabled:opacity-50"
            />
            <label
              htmlFor="confirm-transfer"
              className={`text-sm ${!selectedMemberId ? 'text-text-secondary' : ''}`}
            >
              {text.confirmTemplateStart}
              <span className="font-medium text-warning">
                {selectedMember?.user?.username || text.selectedMember}
              </span>
              {text.confirmTemplateEnd}
            </label>
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
              disabled={loading || !selectedMemberId || !confirmed}
              className="flex-1 py-2.5 px-4 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" />
                  {text.transferring}
                </>
              ) : (
                <>
                  <i className="fas fa-exchange-alt" />
                  {text.confirmTransfer}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
