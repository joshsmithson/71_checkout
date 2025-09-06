export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      friends: {
        Row: {
          id: string
          name: string
          creator_id: string
          avatar_url: string | null
          created_at: string
          last_played: string
        }
        Insert: {
          id?: string
          name: string
          creator_id: string
          avatar_url?: string | null
          created_at?: string
          last_played?: string
        }
        Update: {
          id?: string
          name?: string
          creator_id?: string
          avatar_url?: string | null
          created_at?: string
          last_played?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          created_at: string
          updated_at: string | null
          email: string | null
        }
        Insert: {
          id: string
          name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          id: string
          type: string
          creator_id: string
          status: string
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          creator_id: string
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          creator_id?: string
          status?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          player_type: string
          starting_score: number
          order: number
          winner: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          player_type: string
          starting_score: number
          order: number
          winner?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          player_type?: string
          starting_score?: number
          order?: number
          winner?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      turns: {
        Row: {
          id: string
          game_id: string
          player_id: string
          player_type: string
          turn_number: number
          scores: number[]
          remaining: number
          checkout: boolean
          created_at: string
          edited: boolean
          edited_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          player_type: string
          turn_number: number
          scores: number[]
          remaining: number
          checkout?: boolean
          created_at?: string
          edited?: boolean
          edited_at?: string | null
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          player_type?: string
          turn_number?: number
          scores?: number[]
          remaining?: number
          checkout?: boolean
          created_at?: string
          edited?: boolean
          edited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turns_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      statistics: {
        Row: {
          id: string
          player_id: string
          player_type: string
          game_type: string
          games_played: number
          games_won: number
          total_score: number
          highest_turn: number
          checkout_percentage: number
          average_per_dart: number
          count_180: number
          last_updated: string
        }
        Insert: {
          id?: string
          player_id: string
          player_type: string
          game_type: string
          games_played?: number
          games_won?: number
          total_score?: number
          highest_turn?: number
          checkout_percentage?: number
          average_per_dart?: number
          count_180?: number
          last_updated?: string
        }
        Update: {
          id?: string
          player_id?: string
          player_type?: string
          game_type?: string
          games_played?: number
          games_won?: number
          total_score?: number
          highest_turn?: number
          checkout_percentage?: number
          average_per_dart?: number
          count_180?: number
          last_updated?: string
        }
        Relationships: []
      }
      rivals: {
        Row: {
          id: string
          player1_id: string
          player2_id: string
          player1_type: string
          player2_type: string
          player1_wins: number
          player2_wins: number
          last_game_id: string | null
          highlighted: boolean
          creator_id: string
          created_at: string
        }
        Insert: {
          id?: string
          player1_id: string
          player2_id: string
          player1_type: string
          player2_type: string
          player1_wins?: number
          player2_wins?: number
          last_game_id?: string | null
          highlighted?: boolean
          creator_id: string
          created_at?: string
        }
        Update: {
          id?: string
          player1_id?: string
          player2_id?: string
          player1_type?: string
          player2_type?: string
          player1_wins?: number
          player2_wins?: number
          last_game_id?: string | null
          highlighted?: boolean
          creator_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rivals_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rivals_last_game_id_fkey"
            columns: ["last_game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
      atw_progress: {
        Row: {
          id: string
          game_id: string
          player_id: string
          player_type: string
          current_target: number
          sequence_position: number
          completed_targets: number[]
          multiplier_advances: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          player_type: string
          current_target?: number
          sequence_position?: number
          completed_targets?: number[]
          multiplier_advances?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          player_type?: string
          current_target?: number
          sequence_position?: number
          completed_targets?: number[]
          multiplier_advances?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atw_progress_game_id_fkey"
            columns: ["game_id"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_leaderboard: {
        Args: {
          user_id: string
        }
        Returns: {
          player_id: string
          player_type: string
          player_name: string
          games_played: number
          games_won: number
          win_percentage: number
          average_per_dart: number
          highest_turn: number
          count_180: number
        }[]
      }
      get_rivalry_stats: {
        Args: {
          player1_id: string
          player2_id: string
        }
        Returns: {
          player1_wins: number
          player2_wins: number
          total_games: number
          last_game_date: string
        }[]
      }
      suggest_checkout: {
        Args: {
          remaining_score: number
        }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 