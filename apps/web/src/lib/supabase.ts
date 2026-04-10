import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 验证环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 环境变量未配置。请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// 数据库类型定义
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string | null
          email: string | null
          name: string | null
          image: string | null
          phone: string | null
          phone_verified_at: string | null
          password_hash: string | null
          password_reset_token_hash: string | null
          password_reset_expires_at: string | null
          balance: number
          created_at: string
          updated_at: string
          provider: string | null
          new_api_user_id: number | null
          runtime_username: string | null
          runtime_password: string | null
          runtime_access_token: string | null
          two_factor_enabled: boolean
          two_factor_secret: string | null
          two_factor_enabled_at: string | null
          two_factor_recovery_codes: string[]
        }
        Insert: {
          id?: string
          username?: string | null
          email?: string | null
          name?: string | null
          image?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          password_hash?: string | null
          password_reset_token_hash?: string | null
          password_reset_expires_at?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          provider?: string | null
          new_api_user_id?: number | null
          runtime_username?: string | null
          runtime_password?: string | null
          runtime_access_token?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          two_factor_enabled_at?: string | null
          two_factor_recovery_codes?: string[]
        }
        Update: {
          id?: string
          username?: string | null
          email?: string | null
          name?: string | null
          image?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          password_hash?: string | null
          password_reset_token_hash?: string | null
          password_reset_expires_at?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          provider?: string | null
          new_api_user_id?: number | null
          runtime_username?: string | null
          runtime_password?: string | null
          runtime_access_token?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          two_factor_enabled_at?: string | null
          two_factor_recovery_codes?: string[]
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          id: string
          phone: string
          purpose: 'register' | 'login' | 'bind_phone' | 'reset_password' | 'auth'
          code_hash: string
          expires_at: string
          consumed_at: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          phone: string
          purpose: 'register' | 'login' | 'bind_phone' | 'reset_password' | 'auth'
          code_hash: string
          expires_at: string
          consumed_at?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          purpose?: 'register' | 'login' | 'bind_phone' | 'reset_password' | 'auth'
          code_hash?: string
          expires_at?: string
          consumed_at?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          id: string
          email: string
          purpose: 'auth'
          code_hash: string
          expires_at: string
          consumed_at: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          purpose?: 'auth'
          code_hash: string
          expires_at: string
          consumed_at?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          purpose?: 'auth'
          code_hash?: string
          expires_at?: string
          consumed_at?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      contact_leads: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          inquiry_type: 'sales' | 'support' | 'enterprise' | 'other'
          message: string
          source: string
          locale: string | null
          status: 'new' | 'qualified' | 'contacted' | 'closed' | 'spam'
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          inquiry_type: 'sales' | 'support' | 'enterprise' | 'other'
          message: string
          source?: string
          locale?: string | null
          status?: 'new' | 'qualified' | 'contacted' | 'closed' | 'spam'
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          inquiry_type?: 'sales' | 'support' | 'enterprise' | 'other'
          message?: string
          source?: string
          locale?: string | null
          status?: 'new' | 'qualified' | 'contacted' | 'closed' | 'spam'
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          logo: string | null
          slug: string
          website: string | null
          brand_color: string | null
          logo_path: string | null
          owner_id: string
          created_by: string
          new_api_user_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          logo?: string | null
          slug?: string
          website?: string | null
          brand_color?: string | null
          logo_path?: string | null
          owner_id: string
          created_by: string
          new_api_user_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          logo?: string | null
          slug?: string
          website?: string | null
          brand_color?: string | null
          logo_path?: string | null
          owner_id?: string
          created_by?: string
          new_api_user_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'guest'
          status: 'active' | 'inactive' | 'pending'
          joined_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'guest'
          status?: 'active' | 'inactive' | 'pending'
          joined_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'guest'
          status?: 'active' | 'inactive' | 'pending'
          joined_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          team_id: string
          user_id: string
          action: string
          target_type: string | null
          target_id: string | null
          old_value: string | null
          new_value: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          action: string
          target_type?: string | null
          target_id?: string | null
          old_value?: string | null
          new_value?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          old_value?: string | null
          new_value?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          id: string
          team_id: string
          email: string
          role: 'admin' | 'member' | 'guest'
          status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
          invited_by: string
          invited_user_id: string | null
          responded_by: string | null
          token_hash: string
          expires_at: string
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role: 'admin' | 'member' | 'guest'
          status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
          invited_by: string
          invited_user_id?: string | null
          responded_by?: string | null
          token_hash: string
          expires_at: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          role?: 'admin' | 'member' | 'guest'
          status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
          invited_by?: string
          invited_user_id?: string | null
          responded_by?: string | null
          token_hash?: string
          expires_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_join_applications: {
        Row: {
          id: string
          team_id: string
          applicant_user_id: string
          requested_role: 'member' | 'guest'
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          message: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          applicant_user_id: string
          requested_role?: 'member' | 'guest'
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          message?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          applicant_user_id?: string
          requested_role?: 'member' | 'guest'
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          message?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_outbox: {
        Row: {
          id: string
          channel: 'email'
          recipient: string
          subject: string
          body_html: string
          status: 'queued' | 'sent' | 'failed'
          provider: string | null
          error_message: string | null
          metadata: Record<string, unknown>
          sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel?: 'email'
          recipient: string
          subject: string
          body_html: string
          status?: 'queued' | 'sent' | 'failed'
          provider?: string | null
          error_message?: string | null
          metadata?: Record<string, unknown>
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel?: 'email'
          recipient?: string
          subject?: string
          body_html?: string
          status?: 'queued' | 'sent' | 'failed'
          provider?: string | null
          error_message?: string | null
          metadata?: Record<string, unknown>
          sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          payment_method: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          payment_region: 'domestic' | 'international'
          currency: 'CNY' | 'USD'
          amount: number
          status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
          fulfillment_status: 'pending' | 'processing' | 'applied' | 'failed'
          checkout_reference: string
          external_order_id: string | null
          paid_at: string | null
          expires_at: string | null
          fulfilled_at: string | null
          fulfilled_amount: number | null
          fulfilled_new_api_user_id: number | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          payment_method: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          payment_region: 'domestic' | 'international'
          currency: 'CNY' | 'USD'
          amount: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
          fulfillment_status?: 'pending' | 'processing' | 'applied' | 'failed'
          checkout_reference: string
          external_order_id?: string | null
          paid_at?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_amount?: number | null
          fulfilled_new_api_user_id?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          payment_method?: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          payment_region?: 'domestic' | 'international'
          currency?: 'CNY' | 'USD'
          amount?: number
          status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
          fulfillment_status?: 'pending' | 'processing' | 'applied' | 'failed'
          checkout_reference?: string
          external_order_id?: string | null
          paid_at?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_amount?: number | null
          fulfilled_new_api_user_id?: number | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_transactions: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          transaction_type: 'recharge'
          source_type: 'payment_order'
          source_id: string
          amount: number
          currency: 'CNY' | 'USD'
          balance_before: number
          balance_after: number
          status: 'applied' | 'reversed'
          description: string | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          transaction_type: 'recharge'
          source_type: 'payment_order'
          source_id: string
          amount: number
          currency: 'CNY' | 'USD'
          balance_before: number
          balance_after: number
          status?: 'applied' | 'reversed'
          description?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          transaction_type?: 'recharge'
          source_type?: 'payment_order'
          source_id?: string
          amount?: number
          currency?: 'CNY' | 'USD'
          balance_before?: number
          balance_after?: number
          status?: 'applied' | 'reversed'
          description?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          id: string
          provider: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          event_id: string
          checkout_reference: string | null
          external_order_id: string | null
          payment_status: string | null
          processing_status: 'received' | 'processed' | 'ignored' | 'failed'
          error_message: string | null
          payload: Record<string, unknown>
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          event_id: string
          checkout_reference?: string | null
          external_order_id?: string | null
          payment_status?: string | null
          processing_status?: 'received' | 'processed' | 'ignored' | 'failed'
          error_message?: string | null
          payload?: Record<string, unknown>
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: 'alipay' | 'wechat_pay' | 'credit_card' | 'paypal'
          event_id?: string
          checkout_reference?: string | null
          external_order_id?: string | null
          payment_status?: string | null
          processing_status?: 'received' | 'processed' | 'ignored' | 'failed'
          error_message?: string | null
          payload?: Record<string, unknown>
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      enterprise_channel_configs: {
        Row: {
          id: string
          team_id: string
          provider_type: number
          name: string
          base_url: string | null
          models: string
          test_model: string | null
          group_name: string
          tag: string | null
          priority: number
          weight: number
          auto_ban: boolean
          status: 'draft' | 'active' | 'disabled' | 'archived'
          config_payload: Record<string, unknown>
          new_api_channel_id: number | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error: string | null
          last_synced_at: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          provider_type: number
          name: string
          base_url?: string | null
          models?: string
          test_model?: string | null
          group_name?: string
          tag?: string | null
          priority?: number
          weight?: number
          auto_ban?: boolean
          status?: 'draft' | 'active' | 'disabled' | 'archived'
          config_payload?: Record<string, unknown>
          new_api_channel_id?: number | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          provider_type?: number
          name?: string
          base_url?: string | null
          models?: string
          test_model?: string | null
          group_name?: string
          tag?: string | null
          priority?: number
          weight?: number
          auto_ban?: boolean
          status?: 'draft' | 'active' | 'disabled' | 'archived'
          config_payload?: Record<string, unknown>
          new_api_channel_id?: number | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_model_policies: {
        Row: {
          id: string
          team_id: string
          model_name: string
          display_name: string | null
          enabled: boolean
          visibility: 'internal' | 'team' | 'public'
          category: string | null
          tags: string[]
          pricing_override: Record<string, unknown>
          routing_group: string | null
          config_payload: Record<string, unknown>
          new_api_model_ref: string | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error: string | null
          last_synced_at: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          model_name: string
          display_name?: string | null
          enabled?: boolean
          visibility?: 'internal' | 'team' | 'public'
          category?: string | null
          tags?: string[]
          pricing_override?: Record<string, unknown>
          routing_group?: string | null
          config_payload?: Record<string, unknown>
          new_api_model_ref?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          model_name?: string
          display_name?: string | null
          enabled?: boolean
          visibility?: 'internal' | 'team' | 'public'
          category?: string | null
          tags?: string[]
          pricing_override?: Record<string, unknown>
          routing_group?: string | null
          config_payload?: Record<string, unknown>
          new_api_model_ref?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      enterprise_router_policies: {
        Row: {
          id: string
          team_id: string
          policy_name: string
          fallback_enabled: boolean
          retry_count: number
          load_balance_mode: 'priority' | 'weighted' | 'round_robin' | 'manual'
          channel_weights: Record<string, unknown>
          channel_priorities: Record<string, unknown>
          rate_limit: Record<string, unknown>
          affinity_ttl: number | null
          circuit_breaker_enabled: boolean
          config_payload: Record<string, unknown>
          new_api_router_ref: string | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error: string | null
          last_synced_at: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          policy_name: string
          fallback_enabled?: boolean
          retry_count?: number
          load_balance_mode?: 'priority' | 'weighted' | 'round_robin' | 'manual'
          channel_weights?: Record<string, unknown>
          channel_priorities?: Record<string, unknown>
          rate_limit?: Record<string, unknown>
          affinity_ttl?: number | null
          circuit_breaker_enabled?: boolean
          config_payload?: Record<string, unknown>
          new_api_router_ref?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          policy_name?: string
          fallback_enabled?: boolean
          retry_count?: number
          load_balance_mode?: 'priority' | 'weighted' | 'round_robin' | 'manual'
          channel_weights?: Record<string, unknown>
          channel_priorities?: Record<string, unknown>
          rate_limit?: Record<string, unknown>
          affinity_ttl?: number | null
          circuit_breaker_enabled?: boolean
          config_payload?: Record<string, unknown>
          new_api_router_ref?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_api_keys: {
        Row: {
          id: number
          team_id: string | null
          user_id: string | null
          name: string
          remark: string | null
          subnet: string | null
          permission_scopes: string[]
          last_full_key_viewed_at: string | null
          last_full_key_viewed_by: string | null
          status: 'active' | 'disabled' | 'expired' | 'exhausted'
          expires_at: string | null
          quota: number
          used_quota: number
          unlimited_quota: boolean
          models: string[]
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          team_id?: string | null
          user_id?: string | null
          name: string
          remark?: string | null
          subnet?: string | null
          permission_scopes?: string[]
          last_full_key_viewed_at?: string | null
          last_full_key_viewed_by?: string | null
          status?: 'active' | 'disabled' | 'expired' | 'exhausted'
          expires_at?: string | null
          quota?: number
          used_quota?: number
          unlimited_quota?: boolean
          models?: string[]
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          team_id?: string | null
          user_id?: string | null
          name?: string
          remark?: string | null
          subnet?: string | null
          permission_scopes?: string[]
          last_full_key_viewed_at?: string | null
          last_full_key_viewed_by?: string | null
          status?: 'active' | 'disabled' | 'expired' | 'exhausted'
          expires_at?: string | null
          quota?: number
          used_quota?: number
          unlimited_quota?: boolean
          models?: string[]
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_api_key_sync: {
        Row: {
          id: number
          org_api_key_id: number
          new_api_token_id: number | null
          runtime_key: string | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          org_api_key_id: number
          new_api_token_id?: number | null
          runtime_key?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          org_api_key_id?: number
          new_api_token_id?: number | null
          runtime_key?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_runtime_accounts: {
        Row: {
          id: number
          team_id: string
          new_api_user_id: number | null
          runtime_username: string
          runtime_password: string
          runtime_access_token: string | null
          runtime_quota_credit_total: number
          runtime_quota_bootstrapped_at: string | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error: string | null
          last_synced_at: string | null
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          team_id: string
          new_api_user_id?: number | null
          runtime_username: string
          runtime_password: string
          runtime_access_token?: string | null
          runtime_quota_credit_total?: number
          runtime_quota_bootstrapped_at?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          team_id?: string
          new_api_user_id?: number | null
          runtime_username?: string
          runtime_password?: string
          runtime_access_token?: string | null
          runtime_quota_credit_total?: number
          runtime_quota_bootstrapped_at?: string | null
          sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | 'drifted'
          sync_error?: string | null
          last_synced_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_usage_ledger: {
        Row: {
          id: number
          team_id: string | null
          user_id: string | null
          org_api_key_id: number | null
          new_api_log_id: number | null
          model: string
          provider: string | null
          request_count: number
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          amount: number
          currency: string
          status: 'success' | 'failed'
          error_message: string | null
          runtime_channel_id: number | null
          runtime_token_name: string | null
          runtime_request_id: string | null
          runtime_content: string | null
          runtime_use_time: number | null
          runtime_is_stream: boolean
          runtime_other: Record<string, unknown>
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: number
          team_id?: string | null
          user_id?: string | null
          org_api_key_id?: number | null
          new_api_log_id?: number | null
          model: string
          provider?: string | null
          request_count?: number
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          amount?: number
          currency?: string
          status?: 'success' | 'failed'
          error_message?: string | null
          runtime_channel_id?: number | null
          runtime_token_name?: string | null
          runtime_request_id?: string | null
          runtime_content?: string | null
          runtime_use_time?: number | null
          runtime_is_stream?: boolean
          runtime_other?: Record<string, unknown>
          occurred_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          team_id?: string | null
          user_id?: string | null
          org_api_key_id?: number | null
          new_api_log_id?: number | null
          model?: string
          provider?: string | null
          request_count?: number
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          amount?: number
          currency?: string
          status?: 'success' | 'failed'
          error_message?: string | null
          runtime_channel_id?: number | null
          runtime_token_name?: string | null
          runtime_request_id?: string | null
          runtime_content?: string | null
          runtime_use_time?: number | null
          runtime_is_stream?: boolean
          runtime_other?: Record<string, unknown>
          occurred_at?: string
          created_at?: string
        }
        Relationships: []
      }
      org_billing_ledger: {
        Row: {
          id: number
          team_id: string
          type: 'topup' | 'usage' | 'refund' | 'adjustment'
          reference_id: string | null
          amount: number
          balance_after: number | null
          metadata: Record<string, unknown>
          occurred_at: string
          created_at: string
        }
        Insert: {
          id?: number
          team_id: string
          type: 'topup' | 'usage' | 'refund' | 'adjustment'
          reference_id?: string | null
          amount: number
          balance_after?: number | null
          metadata?: Record<string, unknown>
          occurred_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          team_id?: string
          type?: 'topup' | 'usage' | 'refund' | 'adjustment'
          reference_id?: string | null
          amount?: number
          balance_after?: number | null
          metadata?: Record<string, unknown>
          occurred_at?: string
          created_at?: string
        }
        Relationships: []
      }
      org_runtime_sync_jobs: {
        Row: {
          id: number
          entity_type: 'api_key' | 'usage_pull' | 'billing_reconcile'
          entity_id: number
          action: 'create' | 'update' | 'delete' | 'resync'
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload: Record<string, unknown>
          response_payload: Record<string, unknown>
          error_message: string | null
          attempt_count: number
          last_attempt_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          entity_type: 'api_key' | 'usage_pull' | 'billing_reconcile'
          entity_id: number
          action: 'create' | 'update' | 'delete' | 'resync'
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload?: Record<string, unknown>
          response_payload?: Record<string, unknown>
          error_message?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          entity_type?: 'api_key' | 'usage_pull' | 'billing_reconcile'
          entity_id?: number
          action?: 'create' | 'update' | 'delete' | 'resync'
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload?: Record<string, unknown>
          response_payload?: Record<string, unknown>
          error_message?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_runtime_sync_cursors: {
        Row: {
          id: number
          team_id: string
          entity_type: 'usage_pull'
          cursor_key: string
          cursor_value: string | null
          metadata: Record<string, unknown>
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          team_id: string
          entity_type: 'usage_pull'
          cursor_key: string
          cursor_value?: string | null
          metadata?: Record<string, unknown>
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          team_id?: string
          entity_type?: 'usage_pull'
          cursor_key?: string
          cursor_value?: string | null
          metadata?: Record<string, unknown>
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          id: string
          entity_type: 'channel' | 'model_policy' | 'router_policy' | 'token'
          entity_id: string
          action: 'create' | 'update' | 'delete' | 'resync'
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload: Record<string, unknown>
          response_payload: Record<string, unknown>
          error_message: string | null
          attempt_count: number
          last_attempt_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_type: 'channel' | 'model_policy' | 'router_policy' | 'token'
          entity_id: string
          action: 'create' | 'update' | 'delete' | 'resync'
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload?: Record<string, unknown>
          response_payload?: Record<string, unknown>
          error_message?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'channel' | 'model_policy' | 'router_policy' | 'token'
          entity_id?: string
          action?: 'create' | 'update' | 'delete' | 'resync'
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          request_payload?: Record<string, unknown>
          response_payload?: Record<string, unknown>
          error_message?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 客户端单例（用于浏览器端）
let clientInstance: SupabaseClient<Database> | null = null

/**
 * 获取 Supabase 客户端（浏览器端使用）
 * 使用单例模式避免重复创建客户端
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return clientInstance
}

/**
 * 创建 Supabase 服务端客户端
 * 每次调用创建新实例，适用于 API Routes 和 Server Components
 */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 创建 Supabase 服务端管理员客户端
 * 仅用于 API Routes / Server Actions 中受应用权限控制的敏感写入
 */
export function createServerAdminSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseServiceRoleKey) {
    throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY，无法访问组织级受保护数据')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// 默认导出客户端获取函数
export default getSupabaseClient
