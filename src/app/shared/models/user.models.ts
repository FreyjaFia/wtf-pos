export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  isActive: boolean;
  imageUrl?: string | null;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

export interface UpdateUserDto {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password?: string;
}

export interface GetUsersQuery {
  isActive?: boolean;
  searchTerm?: string;
}
