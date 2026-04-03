import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        try {
            const params = new URLSearchParams(window.location.search);
            const data = params.get('data');

            if (!data) {
                console.error('OAuthCallback: no data param found');
                navigate('/', { replace: true });
                return;
            }

            const user = JSON.parse(atob(data));
            console.log('OAuthCallback: user decoded successfully', user);

            localStorage.setItem('user', JSON.stringify(user));

            // Small timeout ensures React Router is fully mounted before navigating
            setTimeout(() => {
                navigate(
                    user.role === 'company' ? '/company-dashboard' : '/candidate-dashboard',
                    { replace: true }
                );
            }, 100);

        } catch (err) {
            console.error('OAuthCallback: failed to parse user data', err);
            navigate('/', { replace: true });
        }
    }, [navigate]);

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