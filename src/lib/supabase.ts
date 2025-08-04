// Re-export the same client instance from supabase-auth to avoid multiple instances
import { createClient } from './supabase-auth'

export const supabase = createClient()