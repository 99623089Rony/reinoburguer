
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('--- Supabase Config Check ---');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey?.length);
console.log('Key start:', supabaseAnonKey?.substring(0, 10));
console.log('Key end:', supabaseAnonKey?.substring(supabaseAnonKey?.length - 10));
console.log('---------------------------');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing. Running in implementation/mock mode.');
    // throw new Error('As variáveis de ambiente do Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) não foram encontradas. Verifique seu arquivo .env ou .env.local.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');
