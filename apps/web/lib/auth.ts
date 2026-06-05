//eslint-disable-next-line
import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const setTokens = (tokens: AuthTokens) => {
  Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, { expires: 1 / 48 }); // 30 mins
  Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, { expires: 14 }); // 14 days
};

export const getAccessToken = () => Cookies.get(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => Cookies.get(REFRESH_TOKEN_KEY);

export const clearTokens = () => {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
};

import ky from "ky";

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const tokens: AuthTokens = await ky
      .post("/api/proxy/auth/refresh", {
        json: { refreshToken },
      })
      .json();

    setTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    console.error("Failed to refresh token", error);
  }
  return undefined;
};
