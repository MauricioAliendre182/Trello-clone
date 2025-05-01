export interface ResponseLogin {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type RefreshTokenResponse = Omit<ResponseLogin, 'message'>;
