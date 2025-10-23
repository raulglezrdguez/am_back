export type CreateUserInput = {
  name: string;
  email: string;
  password?: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: number;
  status: number;
  createdAt?: string;
  updatedAt?: string;
};
