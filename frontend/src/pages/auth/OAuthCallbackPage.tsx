import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      const accessToken = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('OAuth authentication failed. Please try again.');
        setTimeout(() => navigate('/login?error=oauth_failed'), 3000);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Invalid OAuth callback. Missing tokens.');
        setTimeout(() => navigate('/login?error=oauth_failed'), 3000);
        return;
      }

      try {
        await handleOAuthCallback(accessToken, refreshToken);
        navigate('/dashboard');
      } catch (err) {
        setError('Failed to complete authentication. Please try again.');
        setTimeout(() => navigate('/login?error=oauth_failed'), 3000);
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate]);

  // if (error) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-primary-50">
  //       <div className="text-center">
  //         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
  //           <span className="text-red-600 text-2xl">!</span>
  //         </div>
  //         <h2 className="text-xl font-semibold text-primary-900 mb-2">Authentication Failed</h2>
  //         <p className="text-primary-500">{error}</p>
  //         <p className="text-sm text-primary-400 mt-2">Redirecting to login...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-primary-900">Completing sign in...</h2>
        <p className="text-primary-500 mt-2">Please wait while we authenticate you.</p>
      </div>
    </div>
  );
}
