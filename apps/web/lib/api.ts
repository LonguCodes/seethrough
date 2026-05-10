import ky from 'ky';
import { getAccessToken, getRefreshToken, refreshAccessToken, clearTokens } from './auth';

const api = ky.create({
  prefix: '/api/proxy',
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response, retryCount }) => {
        if (response.status === 401 && retryCount === 0) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const newAccessToken = await refreshAccessToken(refreshToken);
              if (newAccessToken) {
                request.headers.set('Authorization', `Bearer ${newAccessToken}`);
                return ky(request);
              }
            } catch (error) {
              console.error('Token refresh failed', error);
            }
          }
          
          // If we reach here, refresh failed or no refresh token
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },
    ],
  },
  timeout: 30000,
});

export default api;
