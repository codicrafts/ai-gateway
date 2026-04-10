import type {
  AdminChannel,
  AdminChannelFormInput,
  AdminVendor,
  AdminVendorFormInput,
} from './admin-types';

export type ProviderConsoleSummary = {
  vendor_count: number;
  channel_count: number;
  enabled_channel_count: number;
  manual_disabled_channel_count: number;
  auto_disabled_channel_count: number;
  unhealthy_channel_count: number;
};

export const PROVIDER_CHANNEL_STATUS_ENABLED = 1;
export const PROVIDER_CHANNEL_STATUS_MANUAL_DISABLED = 2;
export const PROVIDER_CHANNEL_STATUS_AUTO_DISABLED = 3;

export type ProviderConsoleChannelVersion = {
  id: number;
  channel_id: number;
  version: number;
  action: string;
  summary: string;
  snapshot: string;
  operator_id: number | null;
  created_at: number;
};

export type ProviderConsoleSnapshot = {
  vendors: AdminVendor[];
  channels: AdminChannel[];
  summary: ProviderConsoleSummary;
};

export type ProviderConsoleVendorInput = AdminVendorFormInput;
export type ProviderConsoleChannelInput = AdminChannelFormInput;
