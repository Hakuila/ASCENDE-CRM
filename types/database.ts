// P0-06: tipos gerados a partir do schema real (migrations 0001-0007), no
// mesmo formato produzido por `supabase gen types typescript`. Depois de
// rodar `supabase gen types typescript --linked > types/database.ts` num
// ambiente com acesso ao projeto, comparar e substituir por esse output
// oficial — este arquivo foi escrito manualmente lendo as migrations e
// deve ser tratado como uma aproximação de altíssima fidelidade, não como
// a fonte definitiva de verdade (o schema aplicado no banco é).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          cnpj: string | null;
          logo_url: string | null;
          is_demo: boolean;
          public_api_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          cnpj?: string | null;
          logo_url?: string | null;
          is_demo?: boolean;
          public_api_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          cnpj?: string | null;
          logo_url?: string | null;
          is_demo?: boolean;
          public_api_key?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["membership_role"];
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["membership_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["membership_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      companies: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          document: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      pipelines: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      pipeline_stages: {
        Row: {
          id: string;
          organization_id: string;
          pipeline_id: string;
          name: string;
          kind: Database["public"]["Enums"]["lead_stage_kind"];
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pipeline_id: string;
          name: string;
          kind?: Database["public"]["Enums"]["lead_stage_kind"];
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          pipeline_id?: string;
          name?: string;
          kind?: Database["public"]["Enums"]["lead_stage_kind"];
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_sources: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          platform: string;
          name: string;
          external_id: string | null;
          spend: number;
          impressions: number;
          clicks: number;
          leads_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          platform: string;
          name: string;
          external_id?: string | null;
          spend?: number;
          impressions?: number;
          clicks?: number;
          leads_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          platform?: string;
          name?: string;
          external_id?: string | null;
          spend?: number;
          impressions?: number;
          clicks?: number;
          leads_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          company_id: string | null;
          pipeline_id: string | null;
          stage_id: string | null;
          owner_id: string | null;
          campaign_id: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          source: string | null;
          medium: string | null;
          campaign: string | null;
          adset: string | null;
          ad: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          value: number | null;
          notes: string | null;
          external_lead_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          pipeline_id?: string | null;
          stage_id?: string | null;
          owner_id?: string | null;
          campaign_id?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          source?: string | null;
          medium?: string | null;
          campaign?: string | null;
          adset?: string | null;
          ad?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          value?: number | null;
          notes?: string | null;
          external_lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          company_id?: string | null;
          pipeline_id?: string | null;
          stage_id?: string | null;
          owner_id?: string | null;
          campaign_id?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          source?: string | null;
          medium?: string | null;
          campaign?: string | null;
          adset?: string | null;
          ad?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_term?: string | null;
          value?: number | null;
          notes?: string | null;
          external_lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          }
        ];
      };
      deals: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          pipeline_id: string | null;
          stage_id: string | null;
          owner_id: string | null;
          title: string;
          value: number | null;
          expected_close_date: string | null;
          status: Database["public"]["Enums"]["deal_status"];
          closed_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          pipeline_id?: string | null;
          stage_id?: string | null;
          owner_id?: string | null;
          title: string;
          value?: number | null;
          expected_close_date?: string | null;
          status?: Database["public"]["Enums"]["deal_status"];
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lead_id?: string;
          pipeline_id?: string | null;
          stage_id?: string | null;
          owner_id?: string | null;
          title?: string;
          value?: number | null;
          expected_close_date?: string | null;
          status?: Database["public"]["Enums"]["deal_status"];
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deals_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey";
            columns: ["pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      activities: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          author_id: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          author_id?: string | null;
          type: Database["public"]["Enums"]["activity_type"];
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lead_id?: string;
          author_id?: string | null;
          type?: Database["public"]["Enums"]["activity_type"];
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string | null;
          assigned_to: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id?: string | null;
          assigned_to?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lead_id?: string | null;
          assigned_to?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      integrations: {
        Row: {
          id: string;
          organization_id: string;
          provider: Database["public"]["Enums"]["integration_provider"];
          is_active: boolean;
          config: Json;
          // P0-07: referência ao segredo no Supabase Vault — nunca o valor
          // em texto puro. Ver funções set_integration_secret /
          // get_integration_secret.
          access_token_secret_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: Database["public"]["Enums"]["integration_provider"];
          is_active?: boolean;
          config?: Json;
          access_token_secret_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: Database["public"]["Enums"]["integration_provider"];
          is_active?: boolean;
          config?: Json;
          access_token_secret_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          title: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      // P1-02: contadores de rate limiting — só acessada via as funções
      // check_rate_limit/cleanup_rate_limit_hits, nunca diretamente.
      rate_limit_hits: {
        Row: {
          key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          key: string;
          window_start: string;
          count?: number;
        };
        Update: {
          key?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
      // P2-01: histórico de alterações administrativas — só acessada via
      // a função log_audit_event, nunca por insert direto do client.
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      // P2-03: histórico estruturado de mudanças de etapa (from/to),
      // pensado pra métricas — não confundir com activities.
      lead_stage_history: {
        Row: {
          id: string;
          organization_id: string;
          lead_id: string;
          from_stage_id: string | null;
          to_stage_id: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          lead_id: string;
          from_stage_id?: string | null;
          to_stage_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          lead_id?: string;
          from_stage_id?: string | null;
          to_stage_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_stage_history_from_stage_id_fkey";
            columns: ["from_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_stage_history_to_stage_id_fkey";
            columns: ["to_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_stage_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_platform_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      has_org_access: {
        Args: { org_id: string; uid: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { org_id: string; uid: string };
        Returns: boolean;
      };
      // Só pode ser chamada pelo próprio usuário autenticado que vai virar
      // admin da nova organização (usa auth.uid() internamente).
      create_organization_with_admin: {
        Args: { org_name: string };
        Returns: string;
      };
      // Service role apenas — revogada de authenticated/anon (migration 0004).
      create_organization_for_user: {
        Args: { org_name: string; target_user_id: string };
        Returns: string;
      };
      // P0-01 — troca a etapa de posição com a adjacente (up/down).
      reorder_pipeline_stage: {
        Args: { p_stage_id: string; p_direction: string };
        Returns: undefined;
      };
      // P0-07 — grava/rotaciona um segredo de integração no Vault.
      // Executável por authenticated (a própria função checa is_org_admin).
      set_integration_secret: {
        Args: { p_organization_id: string; p_provider: string; p_secret: string };
        Returns: undefined;
      };
      // P0-07 — decifra um segredo de integração. Só service_role.
      get_integration_secret: {
        Args: { p_organization_id: string; p_provider: string };
        Returns: string | null;
      };
      // P1-02 — incrementa e checa um contador de rate limit. Só service_role.
      check_rate_limit: {
        Args: { p_key: string; p_window_seconds: number; p_max_requests: number };
        Returns: Json;
      };
      // P1-02 — poda contadores de rate limit antigos. Só service_role.
      cleanup_rate_limit_hits: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      // P2-01 — grava uma entrada de audit_logs. actor_id vem de auth.uid()
      // internamente, não é um argumento.
      log_audit_event: {
        Args: {
          p_organization_id: string | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_before: Json | null;
          p_after: Json | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      membership_role: "client_admin" | "salesperson";
      lead_stage_kind: "open" | "won" | "lost";
      deal_status: "open" | "won" | "lost";
      activity_type:
        | "created"
        | "status_change"
        | "call"
        | "whatsapp"
        | "email"
        | "meeting"
        | "proposal"
        | "sale"
        | "note";
      task_priority: "low" | "medium" | "high";
      integration_provider: "meta_ads" | "google_ads" | "whatsapp";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// -----------------------------------------------------------------------
// Helpers de conveniência (mesmo padrão usado nos projetos gerados pelo
// Supabase CLI) — permitem escrever `Tables<'leads'>` em vez de
// `Database['public']['Tables']['leads']['Row']` toda vez.
// -----------------------------------------------------------------------

type PublicSchema = Database["public"];

export type Tables<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][PublicTableNameOrOptions]["Row"];

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][PublicTableNameOrOptions]["Insert"];

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][PublicTableNameOrOptions]["Update"];

export type Enums<PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][PublicEnumNameOrOptions];