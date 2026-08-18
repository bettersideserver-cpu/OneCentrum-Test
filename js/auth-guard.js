import { supabase } from './supabase.js';

window.__adminReady = (async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.replace('login.html');
        return false;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

    if (error || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        window.location.replace('login.html');
        return false;
    }

    return true;
})();
