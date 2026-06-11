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
