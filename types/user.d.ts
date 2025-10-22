export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};
