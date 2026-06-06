import ky, { HTTPError } from 'ky';

import { getAccessToken, getRefreshToken, refreshAccessToken, clearTokens } from './auth';

export { HTTPError } from 'ky';

let isRefreshing = false;
let refreshHelpers: Array<() => void> = [];

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
      async ({request, response}) => {
        // If the token is expired (401), start the refresh flow
        if (response.status === 401) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const refrechToken = await getRefreshToken()
              if(!refrechToken) return response;
              await refreshAccessToken(refrechToken);

              refreshHelpers.forEach((cb) => cb());
              refreshHelpers = [];
            } catch (error) {
              // If refresh fails, log them out
              window.location.href = '/login';
              return;
            } finally {
              isRefreshing = false;
            }
          }

          // Wait for the refresh to finish if another request started it
          return new Promise((resolve) => {
            refreshHelpers.push(() => {
              // Re-attach the new token and retry the request
              const token = getAccessToken();
              if (token) {
                request.headers.set('Authorization', `Bearer ${token}`);
              }
              resolve(ky(request));
            });
          });
        }
      },
    ],
  },
  timeout: 30000,
});

export default api;
