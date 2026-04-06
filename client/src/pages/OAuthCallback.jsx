import { useEffect, useRef } from 'react';

const OAuthCallback = () => {
    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        try {
            const params = new URLSearchParams(window.location.search);
            const data = params.get('data');

            if (!data) {
                console.error('OAuthCallback: no data param found');
                window.location.href = '/';
                return;
            }

            const parsed = JSON.parse(atob(data));

            // FIX: guard against malformed payload — if token or user is missing,
            // don't silently store undefined values which break ProtectedRoute
            if (!parsed.token || !parsed.user) {
                console.error('OAuthCallback: missing token or user in decoded payload', parsed);
                window.location.href = '/';
                return;
            }

            localStorage.setItem('token', parsed.token);
            localStorage.setItem('user', JSON.stringify(parsed.user));

            // FIX: redirect immediately after storing — do not call any React state
            // setters after this point, as a re-render could fire ProtectedRoute
            // before the href navigation completes
            window.location.href = parsed.user.role === 'company'
                ? '/company-dashboard'
                : '/candidate-dashboard';

        } catch (err) {
            console.error('OAuthCallback: failed to parse data', err);
            window.location.href = '/';
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Signing you in...</p>
            </div>
        </div>
    );
};

export default OAuthCallback;