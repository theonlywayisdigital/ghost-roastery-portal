export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      account_setup_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          roaster_slug: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          roaster_slug?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          roaster_slug?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_ledger: {
        Row: {
          action_type: string
          created_at: string
          credits_used: number
          granted_by: string | null
          id: string
          metadata: Json | null
          reason: string | null
          roaster_id: string
          source: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_used?: number
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          roaster_id: string
          source?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_used?: number
          granted_by?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          roaster_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_credit_ledger_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_enrollments: {
        Row: {
          automation_id: string
          completed_at: string | null
          contact_id: string
          current_step: number
          enrolled_at: string
          id: string
          next_step_at: string
          status: string
        }
        Insert: {
          automation_id: string
          completed_at?: string | null
          contact_id: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_at?: string
          status?: string
        }
        Update: {
          automation_id?: string
          completed_at?: string | null
          contact_id?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          next_step_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_enrollments_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_step_logs: {
        Row: {
          clicked_at: string | null
          enrollment_id: string
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          step_id: string
        }
        Insert: {
          clicked_at?: string | null
          enrollment_id: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          step_id: string
        }
        Update: {
          clicked_at?: string | null
          enrollment_id?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_step_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "automation_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_step_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          automation_id: string
          config: Json
          created_at: string
          id: string
          step_order: number
          step_type: string
        }
        Insert: {
          automation_id: string
          config?: Json
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
        }
        Update: {
          automation_id?: string
          config?: Json
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          completed_count: number
          created_at: string
          description: string | null
          enrolled_count: number
          id: string
          is_template: boolean
          last_trigger_check_at: string | null
          name: string
          roaster_id: string | null
          status: string
          trigger_config: Json
          trigger_filters: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_template?: boolean
          last_trigger_check_at?: string | null
          name: string
          roaster_id?: string | null
          status?: string
          trigger_config?: Json
          trigger_filters?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          description?: string | null
          enrolled_count?: number
          id?: string
          is_template?: boolean
          last_trigger_check_at?: string | null
          name?: string
          roaster_id?: string | null
          status?: string
          trigger_config?: Json
          trigger_filters?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      bag_sizes: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bag_sizes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          content: Json | null
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          roaster_id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          content?: Json | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          roaster_id: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          content?: Json | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          roaster_id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      breakeven_calculations: {
        Row: {
          breakeven_revenue: number | null
          breakeven_units: number | null
          created_at: string
          fixed_costs_monthly: number
          id: string
          name: string
          notes: string | null
          roaster_id: string
          selling_price_per_unit: number
          updated_at: string
          variable_cost_per_unit: number
        }
        Insert: {
          breakeven_revenue?: number | null
          breakeven_units?: number | null
          created_at?: string
          fixed_costs_monthly: number
          id?: string
          name: string
          notes?: string | null
          roaster_id: string
          selling_price_per_unit: number
          updated_at?: string
          variable_cost_per_unit: number
        }
        Update: {
          breakeven_revenue?: number | null
          breakeven_units?: number | null
          created_at?: string
          fixed_costs_monthly?: number
          id?: string
          name?: string
          notes?: string | null
          roaster_id?: string
          selling_price_per_unit?: number
          updated_at?: string
          variable_cost_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "breakeven_calculations_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_settings: {
        Row: {
          id: string
          max_order_quantity: number
          updated_at: string
          updated_by: string | null
          wholesale_threshold: number
        }
        Insert: {
          id?: string
          max_order_quantity?: number
          updated_at?: string
          updated_by?: string | null
          wholesale_threshold?: number
        }
        Update: {
          id?: string
          max_order_quantity?: number
          updated_at?: string
          updated_by?: string | null
          wholesale_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "builder_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_activity: {
        Row: {
          activity_type: string
          author_id: string | null
          business_id: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          author_id?: string | null
          business_id: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          author_id?: string | null
          business_id?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "business_activity_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notes: {
        Row: {
          author_id: string
          business_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          business_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          business_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          country: string
          county: string | null
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          last_activity_at: string | null
          lead_status: string | null
          name: string
          notes: string | null
          order_count: number
          owner_type: string
          phone: string | null
          postcode: string | null
          roaster_id: string | null
          source: string
          status: string
          total_spend: number
          types: string[]
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lead_status?: string | null
          name: string
          notes?: string | null
          order_count?: number
          owner_type?: string
          phone?: string | null
          postcode?: string | null
          roaster_id?: string | null
          source?: string
          status?: string
          total_spend?: number
          types?: string[]
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lead_status?: string | null
          name?: string
          notes?: string | null
          order_count?: number
          owner_type?: string
          phone?: string | null
          postcode?: string | null
          roaster_id?: string | null
          source?: string
          status?: string
          total_spend?: number
          types?: string[]
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_links: {
        Row: {
          campaign_id: string
          click_count: number
          created_at: string | null
          id: string
          url: string
        }
        Insert: {
          campaign_id: string
          click_count?: number
          created_at?: string | null
          id?: string
          url: string
        }
        Update: {
          campaign_id?: string
          click_count?: number
          created_at?: string | null
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          email: string
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          content: Json
          created_at: string | null
          email_bg_color: string | null
          from_name: string | null
          id: string
          name: string
          preview_text: string | null
          recipient_count: number | null
          reply_to: string | null
          roaster_id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          content?: Json
          created_at?: string | null
          email_bg_color?: string | null
          from_name?: string | null
          id?: string
          name?: string
          preview_text?: string | null
          recipient_count?: number | null
          reply_to?: string | null
          roaster_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          content?: Json
          created_at?: string | null
          email_bg_color?: string | null
          from_name?: string | null
          id?: string
          name?: string
          preview_text?: string | null
          recipient_count?: number | null
          reply_to?: string | null
          roaster_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          cert_name: string
          cert_type: string | null
          certificate_number: string | null
          created_at: string
          document_name: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_body: string | null
          notes: string | null
          reminder_days: number
          roaster_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cert_name: string
          cert_type?: string | null
          certificate_number?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          notes?: string | null
          reminder_days?: number
          roaster_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cert_name?: string
          cert_type?: string | null
          certificate_number?: string | null
          created_at?: string
          document_name?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          notes?: string | null
          reminder_days?: number
          roaster_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          created_at: string
          escalated_to_ticket: boolean
          id: string
          messages: Json
          ticket_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          escalated_to_ticket?: boolean
          id?: string
          messages?: Json
          ticket_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          escalated_to_ticket?: boolean
          id?: string
          messages?: Json
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activity: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_id: string
          contact_id: string
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          contact_id: string
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          birthday: string | null
          business_id: string | null
          business_name: string | null
          city: string | null
          contact_type: string | null
          country: string
          county: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_activity_at: string | null
          last_name: string
          lead_status: string | null
          marketing_consent: boolean
          order_count: number
          owner_id: string | null
          owner_type: string
          people_id: string | null
          phone: string | null
          postcode: string | null
          roaster_id: string | null
          role: string | null
          source: string
          status: string
          tags: string[]
          total_spend: number
          types: string[]
          unsubscribed: boolean | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          birthday?: string | null
          business_id?: string | null
          business_name?: string | null
          city?: string | null
          contact_type?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_activity_at?: string | null
          last_name?: string
          lead_status?: string | null
          marketing_consent?: boolean
          order_count?: number
          owner_id?: string | null
          owner_type?: string
          people_id?: string | null
          phone?: string | null
          postcode?: string | null
          roaster_id?: string | null
          role?: string | null
          source?: string
          status?: string
          tags?: string[]
          total_spend?: number
          types?: string[]
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          birthday?: string | null
          business_id?: string | null
          business_name?: string | null
          city?: string | null
          contact_type?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_activity_at?: string | null
          last_name?: string
          lead_status?: string | null
          marketing_consent?: boolean
          order_count?: number
          owner_id?: string | null
          owner_type?: string
          people_id?: string | null
          phone?: string | null
          postcode?: string | null
          roaster_id?: string | null
          role?: string | null
          source?: string
          status?: string
          tags?: string[]
          total_spend?: number
          types?: string[]
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_people_id_fkey"
            columns: ["people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_calculations: {
        Row: {
          bag_weight_grams: number
          calculated_cost_per_unit: number | null
          calculated_retail_price: number | null
          calculated_wholesale_price: number | null
          created_at: string
          green_bean_id: string | null
          green_cost_per_kg: number
          id: string
          is_template: boolean
          label_cost_per_unit: number
          labour_cost_per_hour: number
          name: string
          notes: string | null
          overhead_per_unit: number
          packaging_cost_per_unit: number
          product_id: string | null
          roast_loss_percent: number
          roast_time_minutes: number
          roaster_id: string
          target_retail_margin_percent: number
          target_wholesale_margin_percent: number
          updated_at: string
        }
        Insert: {
          bag_weight_grams?: number
          calculated_cost_per_unit?: number | null
          calculated_retail_price?: number | null
          calculated_wholesale_price?: number | null
          created_at?: string
          green_bean_id?: string | null
          green_cost_per_kg: number
          id?: string
          is_template?: boolean
          label_cost_per_unit?: number
          labour_cost_per_hour?: number
          name: string
          notes?: string | null
          overhead_per_unit?: number
          packaging_cost_per_unit?: number
          product_id?: string | null
          roast_loss_percent?: number
          roast_time_minutes?: number
          roaster_id: string
          target_retail_margin_percent?: number
          target_wholesale_margin_percent?: number
          updated_at?: string
        }
        Update: {
          bag_weight_grams?: number
          calculated_cost_per_unit?: number | null
          calculated_retail_price?: number | null
          calculated_wholesale_price?: number | null
          created_at?: string
          green_bean_id?: string | null
          green_cost_per_kg?: number
          id?: string
          is_template?: boolean
          label_cost_per_unit?: number
          labour_cost_per_hour?: number
          name?: string
          notes?: string | null
          overhead_per_unit?: number
          packaging_cost_per_unit?: number
          product_id?: string | null
          roast_loss_percent?: number
          roast_time_minutes?: number
          roaster_id?: string
          target_retail_margin_percent?: number
          target_wholesale_margin_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_calculations_green_bean_id_fkey"
            columns: ["green_bean_id"]
            isOneToOne: false
            referencedRelation: "green_beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_calculations_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      cupping_samples: {
        Row: {
          acidity: number | null
          aftertaste: number | null
          balance: number | null
          body: number | null
          clean_cup: number
          created_at: string
          defects_fault: number
          defects_taint: number
          flavour: number | null
          flavour_tags: string[]
          fragrance_aroma: number | null
          green_bean_id: string | null
          id: string
          notes: string | null
          overall: number | null
          roast_log_id: string | null
          roaster_id: string
          sample_label: string | null
          sample_number: number
          session_id: string
          sweetness: number
          total_score: number | null
          uniformity: number
          updated_at: string
        }
        Insert: {
          acidity?: number | null
          aftertaste?: number | null
          balance?: number | null
          body?: number | null
          clean_cup?: number
          created_at?: string
          defects_fault?: number
          defects_taint?: number
          flavour?: number | null
          flavour_tags?: string[]
          fragrance_aroma?: number | null
          green_bean_id?: string | null
          id?: string
          notes?: string | null
          overall?: number | null
          roast_log_id?: string | null
          roaster_id: string
          sample_label?: string | null
          sample_number: number
          session_id: string
          sweetness?: number
          total_score?: number | null
          uniformity?: number
          updated_at?: string
        }
        Update: {
          acidity?: number | null
          aftertaste?: number | null
          balance?: number | null
          body?: number | null
          clean_cup?: number
          created_at?: string
          defects_fault?: number
          defects_taint?: number
          flavour?: number | null
          flavour_tags?: string[]
          fragrance_aroma?: number | null
          green_bean_id?: string | null
          id?: string
          notes?: string | null
          overall?: number | null
          roast_log_id?: string | null
          roaster_id?: string
          sample_label?: string | null
          sample_number?: number
          session_id?: string
          sweetness?: number
          total_score?: number | null
          uniformity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupping_samples_green_bean_id_fkey"
            columns: ["green_bean_id"]
            isOneToOne: false
            referencedRelation: "green_beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupping_samples_roast_log_id_fkey"
            columns: ["roast_log_id"]
            isOneToOne: false
            referencedRelation: "roast_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupping_samples_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupping_samples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cupping_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cupping_sessions: {
        Row: {
          created_at: string
          cupper_name: string | null
          id: string
          notes: string | null
          roaster_id: string
          session_date: string
          session_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cupper_name?: string | null
          id?: string
          notes?: string | null
          roaster_id: string
          session_date?: string
          session_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cupper_name?: string | null
          id?: string
          notes?: string | null
          roaster_id?: string
          session_date?: string
          session_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cupping_sessions_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          name: string
          postcode: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label: string
          name?: string
          postcode: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          name?: string
          postcode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applies_to: string
          auto_apply: boolean
          automation_id: string | null
          campaign_id: string | null
          code: string
          created_at: string
          currency: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          first_order_only: boolean
          id: string
          maximum_discount: number | null
          minimum_order_value: number | null
          product_ids: string[] | null
          roaster_id: string
          source: string
          starts_at: string | null
          status: string
          updated_at: string
          usage_limit: number | null
          usage_per_customer: number
          used_count: number
        }
        Insert: {
          applies_to?: string
          auto_apply?: boolean
          automation_id?: string | null
          campaign_id?: string | null
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          maximum_discount?: number | null
          minimum_order_value?: number | null
          product_ids?: string[] | null
          roaster_id: string
          source?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          usage_limit?: number | null
          usage_per_customer?: number
          used_count?: number
        }
        Update: {
          applies_to?: string
          auto_apply?: boolean
          automation_id?: string | null
          campaign_id?: string | null
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          maximum_discount?: number | null
          minimum_order_value?: number | null
          product_ids?: string[] | null
          roaster_id?: string
          source?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
          usage_limit?: number | null
          usage_per_customer?: number
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          contact_id: string | null
          customer_email: string
          discount_amount: number
          discount_code_id: string
          id: string
          order_id: string | null
          order_value: number
          redeemed_at: string
        }
        Insert: {
          contact_id?: string | null
          customer_email: string
          discount_amount?: number
          discount_code_id: string
          id?: string
          order_id?: string | null
          order_value?: number
          redeemed_at?: string
        }
        Update: {
          contact_id?: string | null
          customer_email?: string
          discount_amount?: number
          discount_code_id?: string
          id?: string
          order_id?: string | null
          order_value?: number
          redeemed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          content: Json
          created_at: string | null
          description: string | null
          email_bg_color: string | null
          id: string
          is_prebuilt: boolean
          name: string
          roaster_id: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string | null
          description?: string | null
          email_bg_color?: string | null
          id?: string
          is_prebuilt?: boolean
          name: string
          roaster_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string | null
          description?: string | null
          email_bg_color?: string | null
          id?: string
          is_prebuilt?: boolean
          name?: string
          roaster_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          business_id: string | null
          consent_given: boolean
          consent_text: string | null
          contact_id: string | null
          created_at: string
          data: Json
          email_verified: boolean
          form_id: string
          id: string
          ip_address: string | null
          source: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          business_id?: string | null
          consent_given?: boolean
          consent_text?: string | null
          contact_id?: string | null
          created_at?: string
          data?: Json
          email_verified?: boolean
          form_id: string
          id?: string
          ip_address?: string | null
          source?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          business_id?: string | null
          consent_given?: boolean
          consent_text?: string | null
          contact_id?: string | null
          created_at?: string
          data?: Json
          email_verified?: boolean
          form_id?: string
          id?: string
          ip_address?: string | null
          source?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ghost_roastery_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          branding: Json
          created_at: string
          description: string | null
          fields: Json
          form_type: string
          id: string
          name: string
          roaster_id: string
          settings: Json
          status: string
          submission_count: number
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          name: string
          roaster_id: string
          settings?: Json
          status?: string
          submission_count?: number
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          name?: string
          roaster_id?: string
          settings?: Json
          status?: string
          submission_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      ghost_roaster_applications: {
        Row: {
          additional_notes: string | null
          business_name: string
          created_at: string | null
          equipment: string | null
          has_colour_label_printer: boolean | null
          id: string
          monthly_capacity: string | null
          physical_address: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roaster_id: string
          status: string | null
          video_tour_url: string | null
          website: string | null
          years_roasting: string | null
        }
        Insert: {
          additional_notes?: string | null
          business_name: string
          created_at?: string | null
          equipment?: string | null
          has_colour_label_printer?: boolean | null
          id?: string
          monthly_capacity?: string | null
          physical_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id: string
          status?: string | null
          video_tour_url?: string | null
          website?: string | null
          years_roasting?: string | null
        }
        Update: {
          additional_notes?: string | null
          business_name?: string
          created_at?: string | null
          equipment?: string | null
          has_colour_label_printer?: boolean | null
          id?: string
          monthly_capacity?: string | null
          physical_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id?: string
          status?: string | null
          video_tour_url?: string | null
          website?: string | null
          years_roasting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ghost_roaster_applications_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      green_bean_movements: {
        Row: {
          balance_after_kg: number
          created_at: string
          created_by: string | null
          green_bean_id: string
          id: string
          movement_type: string
          notes: string | null
          quantity_kg: number
          reference_id: string | null
          reference_type: string | null
          roaster_id: string
          unit_cost: number | null
        }
        Insert: {
          balance_after_kg: number
          created_at?: string
          created_by?: string | null
          green_bean_id: string
          id?: string
          movement_type: string
          notes?: string | null
          quantity_kg: number
          reference_id?: string | null
          reference_type?: string | null
          roaster_id: string
          unit_cost?: number | null
        }
        Update: {
          balance_after_kg?: number
          created_at?: string
          created_by?: string | null
          green_bean_id?: string
          id?: string
          movement_type?: string
          notes?: string | null
          quantity_kg?: number
          reference_id?: string | null
          reference_type?: string | null
          roaster_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "green_bean_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_bean_movements_green_bean_id_fkey"
            columns: ["green_bean_id"]
            isOneToOne: false
            referencedRelation: "green_beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_bean_movements_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      green_beans: {
        Row: {
          altitude_masl: number | null
          arrival_date: string | null
          cost_per_kg: number | null
          created_at: string
          cupping_score: number | null
          current_stock_kg: number
          harvest_year: string | null
          id: string
          is_active: boolean
          lot_number: string | null
          low_stock_threshold_kg: number | null
          name: string
          notes: string | null
          origin_country: string | null
          origin_region: string | null
          process: string | null
          roaster_id: string
          supplier_id: string | null
          tasting_notes: string | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          altitude_masl?: number | null
          arrival_date?: string | null
          cost_per_kg?: number | null
          created_at?: string
          cupping_score?: number | null
          current_stock_kg?: number
          harvest_year?: string | null
          id?: string
          is_active?: boolean
          lot_number?: string | null
          low_stock_threshold_kg?: number | null
          name: string
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          roaster_id: string
          supplier_id?: string | null
          tasting_notes?: string | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          altitude_masl?: number | null
          arrival_date?: string | null
          cost_per_kg?: number | null
          created_at?: string
          cupping_score?: number | null
          current_stock_kg?: number
          harvest_year?: string | null
          id?: string
          is_active?: boolean
          lot_number?: string | null
          low_stock_threshold_kg?: number | null
          name?: string
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          process?: string | null
          roaster_id?: string
          supplier_id?: string | null
          tasting_notes?: string | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "green_beans_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "green_beans_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      grind_options: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grind_options_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_sequences: {
        Row: {
          last_number: number
          roaster_id: string | null
        }
        Insert: {
          last_number?: number
          roaster_id?: string | null
        }
        Update: {
          last_number?: number
          roaster_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          business_id: string | null
          buyer_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_code: string | null
          due_days: number | null
          id: string
          internal_notes: string | null
          invoice_access_token: string | null
          invoice_number: string
          issued_date: string | null
          line_items: Json
          notes: string | null
          offline_payment_method: string | null
          offline_payment_reference: string | null
          order_ids: string[] | null
          owner_type: string | null
          paid_at: string | null
          payment_due_date: string | null
          payment_method: string
          payment_status: string
          platform_fee_amount: number
          platform_fee_percent: number
          reminder_sent_at: string | null
          roaster_id: string | null
          sent_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string | null
          wholesale_access_id: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          due_days?: number | null
          id?: string
          internal_notes?: string | null
          invoice_access_token?: string | null
          invoice_number: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          offline_payment_method?: string | null
          offline_payment_reference?: string | null
          order_ids?: string[] | null
          owner_type?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee_amount?: number
          platform_fee_percent?: number
          reminder_sent_at?: string | null
          roaster_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          wholesale_access_id?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          due_days?: number | null
          id?: string
          internal_notes?: string | null
          invoice_access_token?: string | null
          invoice_number?: string
          issued_date?: string | null
          line_items?: Json
          notes?: string | null
          offline_payment_method?: string | null
          offline_payment_reference?: string | null
          order_ids?: string[] | null
          owner_type?: string | null
          paid_at?: string | null
          payment_due_date?: string | null
          payment_method?: string
          payment_status?: string
          platform_fee_amount?: number
          platform_fee_percent?: number
          reminder_sent_at?: string | null
          roaster_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          wholesale_access_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_wholesale_access_id_fkey"
            columns: ["wholesale_access_id"]
            isOneToOne: false
            referencedRelation: "wholesale_access"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          audience: string[]
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          excerpt: string
          helpful_no: number
          helpful_yes: number
          id: string
          is_active: boolean
          is_featured: boolean
          media: Json | null
          slug: string
          sort_order: number
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          video_url: string | null
          view_count: number
        }
        Insert: {
          audience?: string[]
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          helpful_no?: number
          helpful_yes?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          media?: Json | null
          slug: string
          sort_order?: number
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Update: {
          audience?: string[]
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          helpful_no?: number
          helpful_yes?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          media?: Json | null
          slug?: string
          sort_order?: number
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          audience: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          audience?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          audience?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          canvas_json: Json | null
          created_at: string
          id: string
          name: string
          pdf_url: string | null
          print_url: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_json?: Json | null
          created_at?: string
          id?: string
          name?: string
          pdf_url?: string | null
          print_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_json?: Json | null
          created_at?: string
          id?: string
          name?: string
          pdf_url?: string | null
          print_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          preference_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          preference_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          preference_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          order_id: string
          order_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          order_id: string
          order_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          order_type?: string
        }
        Relationships: []
      }
      order_communications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          order_id: string
          order_type: string
          recipient_email: string
          sent_at: string | null
          sent_by: string | null
          subject: string
          template_key: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          order_id: string
          order_type: string
          recipient_email: string
          sent_at?: string | null
          sent_by?: string | null
          subject: string
          template_key?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          order_id?: string
          order_type?: string
          recipient_email?: string
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
          template_key?: string | null
        }
        Relationships: []
      }
      ghost_orders: {
        Row: {
          artwork_status: string | null
          bag_colour: string
          bag_size: string
          brand_name: string | null
          cancellation_reason: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          delivery_address: Json | null
          delivery_country: string | null
          dispute_status: string | null
          dispute_ticket_id: string | null
          fulfilment_type: string | null
          grind: string
          id: string
          label_file_url: string | null
          label_id: string | null
          mockup_image_url: string | null
          order_number: string
          order_source: string | null
          order_status: string | null
          partner_payout_total: number | null
          partner_rate_per_bag: number | null
          partner_roaster_id: string | null
          payment_status: string | null
          payout_batch_id: string | null
          payout_item_id: string | null
          payout_status: string | null
          price_per_bag: number
          pricing_bracket_id: string | null
          quantity: number
          refund_status: string | null
          refund_total: number | null
          roast_profile: string
          roaster_id: string | null
          routed_at: string | null
          stripe_payment_id: string | null
          stripe_session_id: string | null
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          artwork_status?: string | null
          bag_colour: string
          bag_size: string
          brand_name?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          delivery_country?: string | null
          dispute_status?: string | null
          dispute_ticket_id?: string | null
          fulfilment_type?: string | null
          grind: string
          id?: string
          label_file_url?: string | null
          label_id?: string | null
          mockup_image_url?: string | null
          order_number?: string
          order_source?: string | null
          order_status?: string | null
          partner_payout_total?: number | null
          partner_rate_per_bag?: number | null
          partner_roaster_id?: string | null
          payment_status?: string | null
          payout_batch_id?: string | null
          payout_item_id?: string | null
          payout_status?: string | null
          price_per_bag: number
          pricing_bracket_id?: string | null
          quantity: number
          refund_status?: string | null
          refund_total?: number | null
          roast_profile: string
          roaster_id?: string | null
          routed_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          total_price: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          artwork_status?: string | null
          bag_colour?: string
          bag_size?: string
          brand_name?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          delivery_address?: Json | null
          delivery_country?: string | null
          dispute_status?: string | null
          dispute_ticket_id?: string | null
          fulfilment_type?: string | null
          grind?: string
          id?: string
          label_file_url?: string | null
          label_id?: string | null
          mockup_image_url?: string | null
          order_number?: string
          order_source?: string | null
          order_status?: string | null
          partner_payout_total?: number | null
          partner_rate_per_bag?: number | null
          partner_roaster_id?: string | null
          payment_status?: string | null
          payout_batch_id?: string | null
          payout_item_id?: string | null
          payout_status?: string | null
          price_per_bag?: number
          pricing_bracket_id?: string | null
          quantity?: number
          refund_status?: string | null
          refund_total?: number | null
          roast_profile?: string
          roaster_id?: string | null
          routed_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_dispute_ticket_id_fkey"
            columns: ["dispute_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_partner_roaster_id_fkey"
            columns: ["partner_roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "partner_payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payout_item_id_fkey"
            columns: ["payout_item_id"]
            isOneToOne: false
            referencedRelation: "partner_payout_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pricing_bracket_id_fkey"
            columns: ["pricing_bracket_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          admin_notes: string | null
          application_notes: string | null
          applied_at: string
          created_at: string
          id: string
          proposed_countries: string[] | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          roaster_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          application_notes?: string | null
          applied_at?: string
          created_at?: string
          id?: string
          proposed_countries?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          application_notes?: string | null
          applied_at?: string
          created_at?: string
          id?: string
          proposed_countries?: string[] | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          roaster_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_applications_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payout_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_number: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          partner_count: number
          payment_method: string
          period_end: string | null
          period_start: string | null
          status: string
          total_amount: number
          total_orders: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_number: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          partner_count?: number
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_number?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          partner_count?: number
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          status?: string
          total_amount?: number
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_batches_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payout_items: {
        Row: {
          amount: number
          batch_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          order_id: string
          paid_at: string | null
          payment_method: string
          roaster_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          batch_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id: string
          paid_at?: string | null
          payment_method?: string
          roaster_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          payment_method?: string
          roaster_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "partner_payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ghost_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_items_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_rates: {
        Row: {
          bag_size: string
          bracket_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          negotiated_at: string
          negotiated_by: string | null
          notes: string | null
          rate_per_bag: number
          roaster_id: string
          updated_at: string
        }
        Insert: {
          bag_size: string
          bracket_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          negotiated_at?: string
          negotiated_by?: string | null
          notes?: string | null
          rate_per_bag: number
          roaster_id: string
          updated_at?: string
        }
        Update: {
          bag_size?: string
          bracket_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          negotiated_at?: string
          negotiated_by?: string | null
          notes?: string | null
          rate_per_bag?: number
          roaster_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_rates_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_rates_negotiated_by_fkey"
            columns: ["negotiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_rates_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_roasters: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          ai_credits_topup_balance: number
          ai_generation_reset_at: string | null
          ai_generations_today: number
          auto_approve_wholesale: boolean | null
          auto_send_invoices: boolean | null
          bank_account_number: string | null
          bank_name: string | null
          bank_sort_code: string | null
          billing_email: string | null
          brand_about: string | null
          brand_accent_colour: string | null
          brand_body_font: string | null
          brand_facebook: string | null
          brand_heading_font: string | null
          brand_hero_image_url: string | null
          brand_instagram: string | null
          brand_logo_url: string | null
          brand_primary_colour: string | null
          brand_tagline: string | null
          brand_tiktok: string | null
          business_name: string
          business_phone: string | null
          business_type: string | null
          city: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_name: string
          country: string
          county: string | null
          created_at: string | null
          default_dispatch_time: string | null
          default_payment_terms: number | null
          discount_note: string | null
          dispatch_cutoff_time: string | null
          dispatch_days: string[] | null
          email: string
          ghost_roaster_application_status: string | null
          ghost_roaster_applied_at: string | null
          ghost_roaster_approved_at: string | null
          grace_period_expires_at: string | null
          id: string
          invoice_currency: string | null
          invoice_prefix: string | null
          invoice_reminder_enabled: boolean | null
          is_active: boolean | null
          is_ghost_roaster: boolean | null
          is_verified: boolean | null
          label_fulfilment: string
          last_login_at: string | null
          late_payment_terms: string | null
          marketing_billing_cycle: string | null
          marketing_discount_percent: number
          marketing_tier: string
          minimum_wholesale_order: number | null
          monthly_ai_credits_reset_at: string | null
          monthly_ai_credits_used: number
          monthly_email_reset_at: string | null
          monthly_emails_sent: number | null
          monthly_wholesale_orders_count: number
          monthly_wholesale_orders_reset_at: string | null
          notes: string | null
          password_hash: string
          payment_instructions: string | null
          phone: string | null
          platform_fee_percent: number | null
          postcode: string | null
          registration_number: string | null
          reminder_days_before_due: number | null
          retail_enabled: boolean | null
          roaster_slug: string | null
          sales_billing_cycle: string | null
          sales_discount_percent: number
          sales_tier: string
          storefront_enabled: boolean | null
          storefront_seo_description: string | null
          storefront_seo_title: string | null
          storefront_setup_complete: boolean | null
          storefront_slug: string | null
          storefront_type: string | null
          strikes: number | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_marketing_subscription_id: string | null
          stripe_sales_subscription_id: string | null
          stripe_website_subscription_id: string | null
          subscription_past_due_since: string | null
          subscription_status: string | null
          tier_changed_at: string | null
          tier_override_by: string | null
          tier_override_reason: string | null
          updated_at: string | null
          user_id: string | null
          vat_number: string | null
          vat_registered: boolean | null
          website: string | null
          website_billing_cycle: string | null
          website_custom_domain: string | null
          website_discount_percent: number | null
          website_domain_verified: boolean | null
          website_enabled: boolean
          website_subscription_active: boolean | null
          website_template: string | null
          wholesale_enabled: boolean | null
          wholesale_stripe_enabled: boolean
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_credits_topup_balance?: number
          ai_generation_reset_at?: string | null
          ai_generations_today?: number
          auto_approve_wholesale?: boolean | null
          auto_send_invoices?: boolean | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          billing_email?: string | null
          brand_about?: string | null
          brand_accent_colour?: string | null
          brand_body_font?: string | null
          brand_facebook?: string | null
          brand_heading_font?: string | null
          brand_hero_image_url?: string | null
          brand_instagram?: string | null
          brand_logo_url?: string | null
          brand_primary_colour?: string | null
          brand_tagline?: string | null
          brand_tiktok?: string | null
          business_name: string
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          default_dispatch_time?: string | null
          default_payment_terms?: number | null
          discount_note?: string | null
          dispatch_cutoff_time?: string | null
          dispatch_days?: string[] | null
          email: string
          ghost_roaster_application_status?: string | null
          ghost_roaster_applied_at?: string | null
          ghost_roaster_approved_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          invoice_currency?: string | null
          invoice_prefix?: string | null
          invoice_reminder_enabled?: boolean | null
          is_active?: boolean | null
          is_ghost_roaster?: boolean | null
          is_verified?: boolean | null
          label_fulfilment?: string
          last_login_at?: string | null
          late_payment_terms?: string | null
          marketing_billing_cycle?: string | null
          marketing_discount_percent?: number
          marketing_tier?: string
          minimum_wholesale_order?: number | null
          monthly_ai_credits_reset_at?: string | null
          monthly_ai_credits_used?: number
          monthly_email_reset_at?: string | null
          monthly_emails_sent?: number | null
          monthly_wholesale_orders_count?: number
          monthly_wholesale_orders_reset_at?: string | null
          notes?: string | null
          password_hash: string
          payment_instructions?: string | null
          phone?: string | null
          platform_fee_percent?: number | null
          postcode?: string | null
          registration_number?: string | null
          reminder_days_before_due?: number | null
          retail_enabled?: boolean | null
          roaster_slug?: string | null
          sales_billing_cycle?: string | null
          sales_discount_percent?: number
          sales_tier?: string
          storefront_enabled?: boolean | null
          storefront_seo_description?: string | null
          storefront_seo_title?: string | null
          storefront_setup_complete?: boolean | null
          storefront_slug?: string | null
          storefront_type?: string | null
          strikes?: number | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_marketing_subscription_id?: string | null
          stripe_sales_subscription_id?: string | null
          stripe_website_subscription_id?: string | null
          subscription_past_due_since?: string | null
          subscription_status?: string | null
          tier_changed_at?: string | null
          tier_override_by?: string | null
          tier_override_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: string | null
          vat_registered?: boolean | null
          website?: string | null
          website_billing_cycle?: string | null
          website_custom_domain?: string | null
          website_discount_percent?: number | null
          website_domain_verified?: boolean | null
          website_enabled?: boolean
          website_subscription_active?: boolean | null
          website_template?: string | null
          wholesale_enabled?: boolean | null
          wholesale_stripe_enabled?: boolean
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          ai_credits_topup_balance?: number
          ai_generation_reset_at?: string | null
          ai_generations_today?: number
          auto_approve_wholesale?: boolean | null
          auto_send_invoices?: boolean | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          billing_email?: string | null
          brand_about?: string | null
          brand_accent_colour?: string | null
          brand_body_font?: string | null
          brand_facebook?: string | null
          brand_heading_font?: string | null
          brand_hero_image_url?: string | null
          brand_instagram?: string | null
          brand_logo_url?: string | null
          brand_primary_colour?: string | null
          brand_tagline?: string | null
          brand_tiktok?: string | null
          business_name?: string
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          country?: string
          county?: string | null
          created_at?: string | null
          default_dispatch_time?: string | null
          default_payment_terms?: number | null
          discount_note?: string | null
          dispatch_cutoff_time?: string | null
          dispatch_days?: string[] | null
          email?: string
          ghost_roaster_application_status?: string | null
          ghost_roaster_applied_at?: string | null
          ghost_roaster_approved_at?: string | null
          grace_period_expires_at?: string | null
          id?: string
          invoice_currency?: string | null
          invoice_prefix?: string | null
          invoice_reminder_enabled?: boolean | null
          is_active?: boolean | null
          is_ghost_roaster?: boolean | null
          is_verified?: boolean | null
          label_fulfilment?: string
          last_login_at?: string | null
          late_payment_terms?: string | null
          marketing_billing_cycle?: string | null
          marketing_discount_percent?: number
          marketing_tier?: string
          minimum_wholesale_order?: number | null
          monthly_ai_credits_reset_at?: string | null
          monthly_ai_credits_used?: number
          monthly_email_reset_at?: string | null
          monthly_emails_sent?: number | null
          monthly_wholesale_orders_count?: number
          monthly_wholesale_orders_reset_at?: string | null
          notes?: string | null
          password_hash?: string
          payment_instructions?: string | null
          phone?: string | null
          platform_fee_percent?: number | null
          postcode?: string | null
          registration_number?: string | null
          reminder_days_before_due?: number | null
          retail_enabled?: boolean | null
          roaster_slug?: string | null
          sales_billing_cycle?: string | null
          sales_discount_percent?: number
          sales_tier?: string
          storefront_enabled?: boolean | null
          storefront_seo_description?: string | null
          storefront_seo_title?: string | null
          storefront_setup_complete?: boolean | null
          storefront_slug?: string | null
          storefront_type?: string | null
          strikes?: number | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_marketing_subscription_id?: string | null
          stripe_sales_subscription_id?: string | null
          stripe_website_subscription_id?: string | null
          subscription_past_due_since?: string | null
          subscription_status?: string | null
          tier_changed_at?: string | null
          tier_override_by?: string | null
          tier_override_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: string | null
          vat_registered?: boolean | null
          website?: string | null
          website_billing_cycle?: string | null
          website_custom_domain?: string | null
          website_discount_percent?: number | null
          website_domain_verified?: boolean | null
          website_enabled?: boolean
          website_subscription_active?: boolean | null
          website_template?: string | null
          wholesale_enabled?: boolean | null
          wholesale_stripe_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_roasters_tier_override_by_fkey"
            columns: ["tier_override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_territories: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          country_code: string
          country_name: string
          id: string
          is_active: boolean
          region: string | null
          roaster_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          country_code: string
          country_name: string
          id?: string
          is_active?: boolean
          region?: string | null
          roaster_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          country_code?: string
          country_name?: string
          id?: string
          is_active?: boolean
          region?: string | null
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_territories_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_territories_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          roaster_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          roaster_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          roaster_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          avatar_url: string | null
          city: string | null
          country: string
          county: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          county?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string
          county?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_fee_ledger: {
        Row: {
          collection_month: string | null
          created_at: string | null
          currency: string | null
          fee_amount: number
          fee_percent: number | null
          gross_amount: number
          id: string
          net_to_roaster: number | null
          order_type: string
          reference_id: string | null
          roaster_id: string | null
          status: string
          stripe_debit_id: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          collection_month?: string | null
          created_at?: string | null
          currency?: string | null
          fee_amount: number
          fee_percent?: number | null
          gross_amount: number
          id?: string
          net_to_roaster?: number | null
          order_type: string
          reference_id?: string | null
          roaster_id?: string | null
          status?: string
          stripe_debit_id?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          collection_month?: string | null
          created_at?: string | null
          currency?: string | null
          fee_amount?: number
          fee_percent?: number | null
          gross_amount?: number
          id?: string
          net_to_roaster?: number | null
          order_type?: string
          reference_id?: string | null
          roaster_id?: string | null
          status?: string
          stripe_debit_id?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fee_ledger_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          auto_reminder: boolean
          auto_send_invoices: boolean
          bank_account_number: string | null
          bank_iban: string | null
          bank_name: string | null
          bank_sort_code: string | null
          brand_accent_colour: string | null
          brand_body_font: string | null
          brand_heading_font: string | null
          brand_logo_url: string | null
          brand_primary_colour: string | null
          brand_tagline: string | null
          created_at: string
          default_currency: string
          default_payment_terms: string
          id: string
          invoice_next_number: number
          invoice_notes_default: string | null
          invoice_prefix: string
          late_payment_terms: string | null
          payment_instructions: string | null
          reminder_days_before_due: number
          updated_at: string
        }
        Insert: {
          auto_reminder?: boolean
          auto_send_invoices?: boolean
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          brand_accent_colour?: string | null
          brand_body_font?: string | null
          brand_heading_font?: string | null
          brand_logo_url?: string | null
          brand_primary_colour?: string | null
          brand_tagline?: string | null
          created_at?: string
          default_currency?: string
          default_payment_terms?: string
          id?: string
          invoice_next_number?: number
          invoice_notes_default?: string | null
          invoice_prefix?: string
          late_payment_terms?: string | null
          payment_instructions?: string | null
          reminder_days_before_due?: number
          updated_at?: string
        }
        Update: {
          auto_reminder?: boolean
          auto_send_invoices?: boolean
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          brand_accent_colour?: string | null
          brand_body_font?: string | null
          brand_heading_font?: string | null
          brand_logo_url?: string | null
          brand_primary_colour?: string | null
          brand_tagline?: string | null
          created_at?: string
          default_currency?: string
          default_payment_terms?: string
          id?: string
          invoice_next_number?: number
          invoice_notes_default?: string | null
          invoice_prefix?: string
          late_payment_terms?: string | null
          payment_instructions?: string | null
          reminder_days_before_due?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_change_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          record_id: string
          record_type: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id: string
          record_type: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          record_id?: string
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_change_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tier_brackets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_quantity: number
          min_quantity: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity: number
          min_quantity: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_quantity?: number
          min_quantity?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tier_brackets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tier_prices: {
        Row: {
          bag_size: string
          bracket_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          price_per_bag: number
          shipping_cost: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bag_size: string
          bracket_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          price_per_bag: number
          shipping_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bag_size?: string
          bracket_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          price_per_bag?: number
          shipping_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tier_prices_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tier_prices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          channel: string
          created_at: string | null
          grind_type_id: string | null
          id: string
          is_active: boolean | null
          product_id: string
          retail_price: number | null
          retail_stock_count: number | null
          roaster_id: string
          sku: string | null
          sort_order: number | null
          track_stock: boolean | null
          unit: string | null
          weight_grams: number | null
          wholesale_price: number | null
          wholesale_price_preferred: number | null
          wholesale_price_standard: number | null
          wholesale_price_vip: number | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          grind_type_id?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          retail_price?: number | null
          retail_stock_count?: number | null
          roaster_id: string
          sku?: string | null
          sort_order?: number | null
          track_stock?: boolean | null
          unit?: string | null
          weight_grams?: number | null
          wholesale_price?: number | null
          wholesale_price_preferred?: number | null
          wholesale_price_standard?: number | null
          wholesale_price_vip?: number | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          grind_type_id?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          retail_price?: number | null
          retail_stock_count?: number | null
          roaster_id?: string
          sku?: string | null
          sort_order?: number | null
          track_stock?: boolean | null
          unit?: string | null
          weight_grams?: number | null
          wholesale_price?: number | null
          wholesale_price_preferred?: number | null
          wholesale_price_standard?: number | null
          wholesale_price_vip?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_grind_type_id_fkey"
            columns: ["grind_type_id"]
            isOneToOne: false
            referencedRelation: "roaster_grind_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      production_plans: {
        Row: {
          created_at: string
          expected_loss_percent: number
          expected_roasted_kg: number | null
          green_bean_id: string | null
          green_bean_name: string | null
          id: string
          notes: string | null
          planned_date: string
          planned_weight_kg: number
          priority: number
          product_id: string | null
          roast_log_id: string | null
          roaster_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_loss_percent?: number
          expected_roasted_kg?: number | null
          green_bean_id?: string | null
          green_bean_name?: string | null
          id?: string
          notes?: string | null
          planned_date: string
          planned_weight_kg: number
          priority?: number
          product_id?: string | null
          roast_log_id?: string | null
          roaster_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_loss_percent?: number
          expected_roasted_kg?: number | null
          green_bean_id?: string | null
          green_bean_name?: string | null
          id?: string
          notes?: string | null
          planned_date?: string
          planned_weight_kg?: number
          priority?: number
          product_id?: string | null
          roast_log_id?: string | null
          roaster_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plans_green_bean_id_fkey"
            columns: ["green_bean_id"]
            isOneToOne: false
            referencedRelation: "green_beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_roast_log_id_fkey"
            columns: ["roast_log_id"]
            isOneToOne: false
            referencedRelation: "roast_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plans_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          associated_roaster_id: string | null
          auth_status: string
          created_at: string
          id: string
          invited_by: string | null
          last_login_at: string | null
          people_id: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          associated_roaster_id?: string | null
          auth_status?: string
          created_at?: string
          id: string
          invited_by?: string | null
          last_login_at?: string | null
          people_id: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          associated_roaster_id?: string | null
          auth_status?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          last_login_at?: string | null
          people_id?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_associated_roaster_id_fkey"
            columns: ["associated_roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_people_id_fkey"
            columns: ["people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          failed_reason: string | null
          id: string
          notes: string | null
          order_id: string
          order_type: string
          reason: string
          reason_category: string | null
          refund_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          failed_reason?: string | null
          id?: string
          notes?: string | null
          order_id: string
          order_type: string
          reason: string
          reason_category?: string | null
          refund_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          failed_reason?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          order_type?: string
          reason?: string
          reason_category?: string | null
          refund_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
        }
        Relationships: []
      }
      roast_logs: {
        Row: {
          ambient_humidity_percent: number | null
          ambient_temp_c: number | null
          charge_temp_c: number | null
          created_at: string
          drop_temp_c: number | null
          first_crack_temp_c: number | null
          first_crack_time_seconds: number | null
          green_bean_id: string | null
          green_bean_name: string | null
          green_weight_kg: number
          id: string
          notes: string | null
          operator: string | null
          product_id: string | null
          quality_rating: number | null
          roast_date: string
          roast_level: string | null
          roast_number: string | null
          roast_time_seconds: number | null
          roasted_weight_kg: number | null
          roaster_id: string
          roaster_machine: string | null
          second_crack_temp_c: number | null
          second_crack_time_seconds: number | null
          status: string
          updated_at: string
          weight_loss_percent: number | null
        }
        Insert: {
          ambient_humidity_percent?: number | null
          ambient_temp_c?: number | null
          charge_temp_c?: number | null
          created_at?: string
          drop_temp_c?: number | null
          first_crack_temp_c?: number | null
          first_crack_time_seconds?: number | null
          green_bean_id?: string | null
          green_bean_name?: string | null
          green_weight_kg: number
          id?: string
          notes?: string | null
          operator?: string | null
          product_id?: string | null
          quality_rating?: number | null
          roast_date?: string
          roast_level?: string | null
          roast_number?: string | null
          roast_time_seconds?: number | null
          roasted_weight_kg?: number | null
          roaster_id: string
          roaster_machine?: string | null
          second_crack_temp_c?: number | null
          second_crack_time_seconds?: number | null
          status?: string
          updated_at?: string
          weight_loss_percent?: number | null
        }
        Update: {
          ambient_humidity_percent?: number | null
          ambient_temp_c?: number | null
          charge_temp_c?: number | null
          created_at?: string
          drop_temp_c?: number | null
          first_crack_temp_c?: number | null
          first_crack_time_seconds?: number | null
          green_bean_id?: string | null
          green_bean_name?: string | null
          green_weight_kg?: number
          id?: string
          notes?: string | null
          operator?: string | null
          product_id?: string | null
          quality_rating?: number | null
          roast_date?: string
          roast_level?: string | null
          roast_number?: string | null
          roast_time_seconds?: number | null
          roasted_weight_kg?: number | null
          roaster_id?: string
          roaster_machine?: string | null
          second_crack_temp_c?: number | null
          second_crack_time_seconds?: number | null
          status?: string
          updated_at?: string
          weight_loss_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_logs_green_bean_id_fkey"
            columns: ["green_bean_id"]
            isOneToOne: false
            referencedRelation: "green_beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roast_logs_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roast_profiles: {
        Row: {
          badge: string | null
          created_at: string
          descriptor: string
          id: string
          image_url: string | null
          is_active: boolean
          is_decaf: boolean
          name: string
          roast_level: number
          slug: string
          sort_order: number
          tasting_notes: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string
          descriptor?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_decaf?: boolean
          name: string
          roast_level?: number
          slug: string
          sort_order?: number
          tasting_notes?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string
          descriptor?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_decaf?: boolean
          name?: string
          roast_level?: number
          slug?: string
          sort_order?: number
          tasting_notes?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roast_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_activity: {
        Row: {
          activity_type: string
          author_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          roaster_id: string
        }
        Insert: {
          activity_type: string
          author_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          roaster_id: string
        }
        Update: {
          activity_type?: string
          author_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_activity_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_billing: {
        Row: {
          bank_account_last4: string | null
          bank_account_sort_code: string | null
          id: string
          mandate_created_at: string | null
          mandate_status: string
          roaster_id: string
          stripe_customer_id: string | null
          stripe_mandate_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_last4?: string | null
          bank_account_sort_code?: string | null
          id?: string
          mandate_created_at?: string | null
          mandate_status?: string
          roaster_id: string
          stripe_customer_id?: string | null
          stripe_mandate_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_last4?: string | null
          bank_account_sort_code?: string | null
          id?: string
          mandate_created_at?: string | null
          mandate_status?: string
          roaster_id?: string
          stripe_customer_id?: string | null
          stripe_mandate_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roaster_billing_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: true
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_enquiries: {
        Row: {
          business_name: string | null
          created_at: string | null
          email: string
          enquiry_type: string | null
          id: string
          message: string
          name: string
          notes: string | null
          phone: string | null
          roaster_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          email: string
          enquiry_type?: string | null
          id?: string
          message: string
          name: string
          notes?: string | null
          phone?: string | null
          roaster_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          email?: string
          enquiry_type?: string | null
          id?: string
          message?: string
          name?: string
          notes?: string | null
          phone?: string | null
          roaster_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roaster_enquiries_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_grind_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
          roaster_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          roaster_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          roaster_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roaster_grind_types_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          roaster_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          roaster_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          roaster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roaster_notes_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roaster_orders: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          delivered_at: string | null
          dispatch_deadline: string | null
          dispatched_on_time: boolean | null
          id: string
          label_print_status: string | null
          notes: string | null
          order_id: string
          roasted_at: string | null
          roaster_id: string
          shipped_at: string | null
          status: string
          tracking_carrier: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dispatch_deadline?: string | null
          dispatched_on_time?: boolean | null
          id?: string
          label_print_status?: string | null
          notes?: string | null
          order_id: string
          roasted_at?: string | null
          roaster_id: string
          shipped_at?: string | null
          status?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dispatch_deadline?: string | null
          dispatched_on_time?: boolean | null
          id?: string
          label_print_status?: string | null
          notes?: string | null
          order_id?: string
          roasted_at?: string | null
          roaster_id?: string
          shipped_at?: string | null
          status?: string
          tracking_carrier?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roaster_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ghost_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roaster_orders_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          created_at: string | null
          estimated_days: string | null
          free_threshold: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          roaster_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          roaster_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_days?: string | null
          free_threshold?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          roaster_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_methods_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          last_used_at: string | null
          metadata: Json | null
          page_name: string | null
          platform: string
          platform_page_id: string | null
          platform_user_id: string | null
          refresh_token: string | null
          roaster_id: string
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          page_name?: string | null
          platform: string
          platform_page_id?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          roaster_id: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          page_name?: string | null
          platform?: string
          platform_page_id?: string | null
          platform_user_id?: string | null
          refresh_token?: string | null
          roaster_id?: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_id: string
          reach: number | null
          shares: number | null
          synced_at: string | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_id: string
          reach?: number | null
          shares?: number | null
          synced_at?: string | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_id?: string
          reach?: number | null
          shares?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          failure_reason: Json | null
          id: string
          media_urls: string[] | null
          platform_post_ids: Json | null
          platforms: Json | null
          published_at: string | null
          roaster_id: string
          scheduled_for: string | null
          status: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_reason?: Json | null
          id?: string
          media_urls?: string[] | null
          platform_post_ids?: Json | null
          platforms?: Json | null
          published_at?: string | null
          roaster_id: string
          scheduled_for?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_reason?: Json | null
          id?: string
          media_urls?: string[] | null
          platform_post_ids?: Json | null
          platforms?: Json | null
          published_at?: string | null
          roaster_id?: string
          scheduled_for?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      social_templates: {
        Row: {
          caption_structure: string
          created_at: string | null
          default_platforms: string[] | null
          description: string | null
          hashtag_groups: string[] | null
          id: string
          name: string
          roaster_id: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          caption_structure?: string
          created_at?: string | null
          default_platforms?: string[] | null
          description?: string | null
          hashtag_groups?: string[] | null
          id?: string
          name: string
          roaster_id: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          caption_structure?: string
          created_at?: string | null
          default_platforms?: string[] | null
          description?: string | null
          hashtag_groups?: string[] | null
          id?: string
          name?: string
          roaster_id?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_templates_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          page_url: string | null
          referrer: string | null
          roaster_id: string
          session_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          roaster_id: string
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer?: string | null
          roaster_id?: string
          session_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_events_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_tier: string | null
          previous_tier: string | null
          product_type: string | null
          roaster_id: string
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_tier?: string | null
          previous_tier?: string | null
          product_type?: string | null
          roaster_id: string
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_tier?: string | null
          previous_tier?: string | null
          product_type?: string | null
          roaster_id?: string
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_order_kg: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          roaster_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_kg?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          roaster_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_kg?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          roaster_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_orders: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          notes: string | null
          roaster_id: string
          status: string | null
          total_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          notes?: string | null
          roaster_id: string
          status?: string | null
          total_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          roaster_id?: string
          status?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_orders_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_history: {
        Row: {
          changed_by: string | null
          created_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          chatbot_conversation: Json | null
          closed_at: string | null
          created_at: string
          created_by: string
          created_by_type: string
          description: string
          id: string
          order_id: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          roaster_id: string | null
          status: string
          subject: string
          ticket_number: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chatbot_conversation?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          created_by_type?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          roaster_id?: string | null
          status?: string
          subject: string
          ticket_number?: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chatbot_conversation?: Json | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          created_by_type?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          roaster_id?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          roaster_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          roaster_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          roaster_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          roaster_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          roaster_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          roaster_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      template_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          performed_by: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          roaster_id: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          roaster_id?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          roaster_id?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content: Json
          created_at: string
          footer_sort_order: number
          id: string
          is_nav_button: boolean
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          nav_sort_order: number
          show_in_footer: boolean
          show_in_nav: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          website_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          footer_sort_order?: number
          id?: string
          is_nav_button?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          nav_sort_order?: number
          show_in_footer?: boolean
          show_in_nav?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          website_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          footer_sort_order?: number
          id?: string
          is_nav_button?: boolean
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          nav_sort_order?: number
          show_in_footer?: boolean
          show_in_nav?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          website_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
        ]
      }
      websites: {
        Row: {
          created_at: string
          design_settings: Json
          domain: string | null
          footer_text: string | null
          id: string
          is_published: boolean
          name: string
          roaster_id: string
          subdomain: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_settings?: Json
          domain?: string | null
          footer_text?: string | null
          id?: string
          is_published?: boolean
          name?: string
          roaster_id: string
          subdomain?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_settings?: Json
          domain?: string | null
          footer_text?: string | null
          id?: string
          is_published?: boolean
          name?: string
          roaster_id?: string
          subdomain?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "websites_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: true
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_access: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          approved_at: string | null
          approved_by: string | null
          business_address: string | null
          business_id: string | null
          business_name: string
          business_type: string | null
          business_website: string | null
          city: string | null
          county: string | null
          created_at: string | null
          credit_limit: number | null
          id: string
          monthly_volume: string | null
          notes: string | null
          payment_terms: string
          postcode: string | null
          price_tier: string
          rejected_reason: string | null
          roaster_id: string
          status: string
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_address?: string | null
          business_id?: string | null
          business_name: string
          business_type?: string | null
          business_website?: string | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          monthly_volume?: string | null
          notes?: string | null
          payment_terms?: string
          postcode?: string | null
          price_tier?: string
          rejected_reason?: string | null
          roaster_id: string
          status?: string
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_address?: string | null
          business_id?: string | null
          business_name?: string
          business_type?: string | null
          business_website?: string | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          credit_limit?: number | null
          id?: string
          monthly_volume?: string | null
          notes?: string | null
          payment_terms?: string
          postcode?: string | null
          price_tier?: string
          rejected_reason?: string | null
          roaster_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_access_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_access_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          contact_id: string | null
          created_at: string | null
          customer_business: string | null
          customer_email: string
          customer_first_name: string | null
          customer_last_name: string | null
          customer_name: string
          delivered_at: string | null
          delivery_address: Json
          discount_amount: number
          discount_code: string | null
          discount_code_id: string | null
          dispatched_at: string | null
          id: string
          invoice_id: string | null
          items: Json
          order_channel: string | null
          payment_method: string | null
          payment_terms: string | null
          platform_fee: number
          refund_status: string | null
          refund_total: number | null
          roaster_id: string
          roaster_payout: number
          status: string | null
          stripe_payment_id: string | null
          subtotal: number
          tracking_carrier: string | null
          tracking_number: string | null
          user_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_business?: string | null
          customer_email: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_name: string
          delivered_at?: string | null
          delivery_address: Json
          discount_amount?: number
          discount_code?: string | null
          discount_code_id?: string | null
          dispatched_at?: string | null
          id?: string
          invoice_id?: string | null
          items: Json
          order_channel?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          platform_fee: number
          refund_status?: string | null
          refund_total?: number | null
          roaster_id: string
          roaster_payout: number
          status?: string | null
          stripe_payment_id?: string | null
          subtotal: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          user_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          customer_business?: string | null
          customer_email?: string
          customer_first_name?: string | null
          customer_last_name?: string | null
          customer_name?: string
          delivered_at?: string | null
          delivery_address?: Json
          discount_amount?: number
          discount_code?: string | null
          discount_code_id?: string | null
          dispatched_at?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          order_channel?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          platform_fee?: number
          refund_status?: string | null
          refund_total?: number | null
          roaster_id?: string
          roaster_payout?: number
          status?: string | null
          stripe_payment_id?: string | null
          subtotal?: number
          tracking_carrier?: string | null
          tracking_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string
          created_at: string | null
          description: string | null
          google_product_category: string | null
          gtin: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_purchasable: boolean | null
          is_retail: boolean
          is_wholesale: boolean
          meta_description: string | null
          minimum_wholesale_quantity: number | null
          name: string
          order_multiples: number | null
          price: number
          product_type: string
          retail_price: number | null
          retail_stock_count: number | null
          roaster_id: string
          rrp: number | null
          sku: string | null
          sort_order: number | null
          subscription_frequency: string | null
          track_stock: boolean | null
          unit: string | null
          vat_rate: number | null
          weight_grams: number | null
          wholesale_price: number | null
          wholesale_price_preferred: number | null
          wholesale_price_standard: number | null
          wholesale_price_vip: number | null
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_retail?: boolean
          is_wholesale?: boolean
          meta_description?: string | null
          minimum_wholesale_quantity?: number | null
          name: string
          order_multiples?: number | null
          price: number
          product_type?: string
          retail_price?: number | null
          retail_stock_count?: number | null
          roaster_id: string
          rrp?: number | null
          sku?: string | null
          sort_order?: number | null
          subscription_frequency?: string | null
          track_stock?: boolean | null
          unit?: string | null
          vat_rate?: number | null
          weight_grams?: number | null
          wholesale_price?: number | null
          wholesale_price_preferred?: number | null
          wholesale_price_standard?: number | null
          wholesale_price_vip?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_purchasable?: boolean | null
          is_retail?: boolean
          is_wholesale?: boolean
          meta_description?: string | null
          minimum_wholesale_quantity?: number | null
          name?: string
          order_multiples?: number | null
          price?: number
          product_type?: string
          retail_price?: number | null
          retail_stock_count?: number | null
          roaster_id?: string
          rrp?: number | null
          sku?: string | null
          sort_order?: number | null
          subscription_frequency?: string | null
          track_stock?: boolean | null
          unit?: string | null
          vat_rate?: number | null
          weight_grams?: number | null
          wholesale_price?: number | null
          wholesale_price_preferred?: number | null
          wholesale_price_standard?: number | null
          wholesale_price_vip?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_products_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ghost_roastery_contacts: {
        Row: {
          birthday: string | null
          business_id: string | null
          business_name: string | null
          contact_type: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_activity_at: string | null
          last_name: string | null
          lead_status: string | null
          marketing_consent: boolean | null
          order_count: number | null
          owner_id: string | null
          owner_type: string | null
          people_id: string | null
          person_avatar_url: string | null
          phone: string | null
          roaster_id: string | null
          role: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          total_spend: number | null
          types: string[] | null
          unsubscribed: boolean | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_people_id_fkey"
            columns: ["people_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_roaster_id_fkey"
            columns: ["roaster_id"]
            isOneToOne: false
            referencedRelation: "partner_roasters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrement_ai_topup_balance: {
        Args: { p_count?: number; p_roaster_id: string }
        Returns: undefined
      }
      find_or_create_person: {
        Args: {
          p_email?: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
        }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      generate_ticket_number: { Args: never; Returns: string }
      get_partner_for_order: {
        Args: { p_country_code: string; p_region?: string }
        Returns: {
          match_type: string
          roaster_id: string
          territory_id: string
        }[]
      }
      get_partner_rate: {
        Args: { p_bag_size: string; p_quantity: number; p_roaster_id: string }
        Returns: number
      }
      increment_monthly_ai_credits: {
        Args: { p_count?: number; p_roaster_id: string }
        Returns: undefined
      }
      increment_monthly_wholesale_orders: {
        Args: { p_count?: number; p_roaster_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
