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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entry_date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mistake_logs: {
        Row: {
          created_at: string
          details: string | null
          id: string
          resolved: boolean
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          resolved?: boolean
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          resolved?: boolean
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
          skipped: boolean
          time_taken_secs: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_index?: number | null
          skipped?: boolean
          time_taken_secs?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
          skipped?: boolean
          time_taken_secs?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "practice_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_questions: {
        Row: {
          author_name: string | null
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          options: string[]
          qtype: string
          question: string
          status: string
          subject: string
          tag: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: string[]
          qtype?: string
          question: string
          status?: string
          subject?: string
          tag?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: string[]
          qtype?: string
          question?: string
          status?: string
          subject?: string
          tag?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          created_at: string
          display_name: string | null
          exam_date: string
          id: string
          prep_start_date: string
          social_links: string | null
          stream: string
          target_branch: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          about_me?: string | null
          created_at?: string
          display_name?: string | null
          exam_date?: string
          id?: string
          prep_start_date?: string
          social_links?: string | null
          stream?: string
          target_branch?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          about_me?: string | null
          created_at?: string
          display_name?: string | null
          exam_date?: string
          id?: string
          prep_start_date?: string
          social_links?: string | null
          stream?: string
          target_branch?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      pyq_attempts: {
        Row: {
          answer_text: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
          selected_indices: number[]
          skipped: boolean
          time_taken_secs: number | null
          user_id: string
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_index?: number | null
          selected_indices?: number[]
          skipped?: boolean
          time_taken_secs?: number | null
          user_id: string
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
          selected_indices?: number[]
          skipped?: boolean
          time_taken_secs?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pyq_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "pyq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      pyq_questions: {
        Row: {
          answer_text: string | null
          correct_index: number
          correct_indices: number[]
          created_at: string
          explanation: string | null
          id: string
          image_path: string | null
          marks: number
          options: string[]
          paper: string
          qtype: string
          question: string
          subject: string
          topic: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          answer_text?: string | null
          correct_index?: number
          correct_indices?: number[]
          created_at?: string
          explanation?: string | null
          id?: string
          image_path?: string | null
          marks?: number
          options?: string[]
          paper?: string
          qtype?: string
          question: string
          subject?: string
          topic?: string
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          answer_text?: string | null
          correct_index?: number
          correct_indices?: number[]
          created_at?: string
          explanation?: string | null
          id?: string
          image_path?: string | null
          marks?: number
          options?: string[]
          paper?: string
          qtype?: string
          question?: string
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      streak_days: {
        Row: {
          created_at: string
          day: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      study_hours: {
        Row: {
          created_at: string
          hours: number
          id: string
          log_date: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hours?: number
          id?: string
          log_date?: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          log_date?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_hours_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          kind: string
          size_bytes: number | null
          subject_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          kind?: string
          size_bytes?: number | null
          subject_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          kind?: string
          size_bytes?: number | null
          subject_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          position: number
          scheduled_date: string
          subject_id: string
          tag: string
          title: string
          topics: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          position?: number
          scheduled_date?: string
          subject_id: string
          tag?: string
          title: string
          topics?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          position?: number
          scheduled_date?: string
          subject_id?: string
          tag?: string
          title?: string
          topics?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          source: string | null
          start_date: string | null
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          source?: string | null
          start_date?: string | null
          teacher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          source?: string | null
          start_date?: string | null
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      syllabus_topics: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position: number
          section: string
          topic: string
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          section: string
          topic: string
          track?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          section?: string
          topic?: string
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          due_date: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_date?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_date?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tests: {
        Row: {
          actual_time_mins: number | null
          analysis_time_mins: number | null
          attempted: boolean
          category: string | null
          created_at: string
          id: string
          max_score: number | null
          name: string
          organization: string
          score: number | null
          test_date: string | null
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_time_mins?: number | null
          analysis_time_mins?: number | null
          attempted?: boolean
          category?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          name: string
          organization?: string
          score?: number | null
          test_date?: string | null
          test_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_time_mins?: number | null
          analysis_time_mins?: number | null
          attempted?: boolean
          category?: string | null
          created_at?: string
          id?: string
          max_score?: number | null
          name?: string
          organization?: string
          score?: number | null
          test_date?: string | null
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      practice_leaderboard: {
        Args: never
        Returns: {
          accuracy: number
          attempts: number
          contributed: number
          display_name: string
          solved: number
          user_id: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
