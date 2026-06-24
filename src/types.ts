export interface Week {
  id: string
  user_id: string
  start_date: string // ISO date (Monday) representing the start of the week
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  week_id: string
  name: string
  position: number
  created_at: string
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  log_date: string // ISO date (yyyy-MM-dd)
  completed: boolean
  note: string | null
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  display_name: string | null
  created_at: string
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Wager {
  id: string
  challenger_id: string
  challenged_id: string
  week_start: string
  challenger_target_pct: number
  challenged_target_pct: number | null
  stake: string
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
  created_at: string
  challenger?: Profile
  challenged?: Profile
}
