import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, AuthState } from "../types/auth.types";
import { DEFAULT_PIN } from "../schemas/auth.schemas";

const INITIAL_DEMO_USER: User = {
  id: "usr_felipe",
  username: "felipe",
  name: "Felipe",
  pin: DEFAULT_PIN,
  mustChangePin: false,
  createdAt: new Date().toISOString(),
};

interface ExtendedAuthState extends AuthState {
  cancelChangePin: () => void;
}

export const useAuthStore = create<ExtendedAuthState>()(
  persist(
    (set, get) => ({
      users: [INITIAL_DEMO_USER],
      currentUser: null,
      isAuthenticated: false,
      pendingChangePinUser: null,

      login: (username: string, pin: string) => {
        const cleanUsername = username.trim().toLowerCase();
        let user = get().users.find(
          (u) => u.username.toLowerCase() === cleanUsername
        );

        // Se for o usuário felipe e ele não existir na lista ainda
        if (!user && cleanUsername === "felipe") {
          user = INITIAL_DEMO_USER;
          set((state) => ({ users: [...state.users, INITIAL_DEMO_USER] }));
        }

        if (!user) {
          return { success: false, error: "Usuário não encontrado no sistema." };
        }

        if (user.pin !== pin) {
          return { success: false, error: "Senha incorreta. Verifique e tente novamente." };
        }

        if (user.mustChangePin) {
          set({ pendingChangePinUser: user });
          return { success: true, mustChangePin: true };
        }

        set({
          currentUser: user,
          isAuthenticated: true,
          pendingChangePinUser: null,
        });

        return { success: true, mustChangePin: false };
      },

      register: (username: string, name: string) => {
        const cleanUsername = username.trim().toLowerCase();
        const exists = get().users.some(
          (u) => u.username.toLowerCase() === cleanUsername
        );

        if (exists) {
          return {
            success: false,
            defaultPin: "",
            error: "Este nome de usuário já está em uso.",
          };
        }

        const newUser: User = {
          id: `usr_${Date.now()}`,
          username: cleanUsername,
          name: name.trim(),
          pin: DEFAULT_PIN,
          mustChangePin: true,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          users: [...state.users, newUser],
        }));

        return { success: true, defaultPin: DEFAULT_PIN };
      },

      changePin: (username: string, currentPin: string, newPin: string) => {
        const cleanUsername = username.trim().toLowerCase();
        const user = get().users.find(
          (u) => u.username.toLowerCase() === cleanUsername
        );

        if (!user || user.pin !== currentPin) {
          return { success: false, error: "Usuário ou PIN de origem inválido." };
        }

        const updatedUser: User = {
          ...user,
          pin: newPin,
          mustChangePin: false,
        };

        set((state) => ({
          users: state.users.map((u) =>
            u.id === updatedUser.id ? updatedUser : u
          ),
          currentUser: updatedUser,
          isAuthenticated: true,
          pendingChangePinUser: null,
        }));

        return { success: true };
      },

      cancelChangePin: () => {
        set({ pendingChangePinUser: null });
      },

      logout: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
          pendingChangePinUser: null,
        });
      },
    }),
    {
      name: "financial_auth_store",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const felipeUser: User = {
          id: "usr_felipe",
          username: "felipe",
          name: "Felipe",
          pin: "fkzw5229",
          mustChangePin: false,
          createdAt: new Date().toISOString(),
        };

        if (!persistedState || version < 2) {
          return {
            users: [felipeUser],
            currentUser: felipeUser,
            isAuthenticated: true,
          };
        }

        const currentUsers: User[] = Array.isArray(persistedState.users) ? persistedState.users : [];
        const hasFelipe = currentUsers.some((u) => u.username?.toLowerCase() === "felipe");
        const updatedUsers = hasFelipe
          ? currentUsers.map((u) => (u.username?.toLowerCase() === "felipe" ? { ...u, pin: "fkzw5229", mustChangePin: false } : u))
          : [...currentUsers, felipeUser];

        let currentUser = persistedState.currentUser;
        if (currentUser && (currentUser.username?.toLowerCase() === "usuario" || currentUser.username?.toLowerCase() === "felipe")) {
          currentUser = felipeUser;
        }

        return {
          ...persistedState,
          users: updatedUsers,
          currentUser,
        };
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
