import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Shared session hook — used by both the root route (/) and ProtectedRoute
// so there's only one source of truth for "is there a valid session right now".
export function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}