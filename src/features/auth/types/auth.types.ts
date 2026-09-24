export interface User {
  id: string;
  username: string;
  name: string;
  pin: string;
  mustChangePin: boolean;
  createdAt: string;
}

export interface AuthState {
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  pendingChangePinUser: User | null;
  login: (username: string, pin: string) => { success: boolean; mustChangePin?: boolean; error?: string };
  register: (username: string, name: string) => { success: boolean; defaultPin: string; error?: string };
  changePin: (username: string, currentPin: string, newPin: string) => { success: boolean; error?: string };
  logout: () => void;
}
