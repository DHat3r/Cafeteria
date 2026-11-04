// POST /api/auth/login
export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};
