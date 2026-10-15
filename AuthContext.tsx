import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  nombre: string;
  email: string;
  role: 'voluntario' | 'admin';
  profileImage: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileImage: (uri: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadStoredUser() {
      try {
        const storedUser = await AsyncStorage.getItem('@tunjuelito_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.log('Error al cargar sesión', error);
      }
    }
    loadStoredUser();
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('@tunjuelito_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@tunjuelito_user');
  };

  const updateProfileImage = async (uri: string) => {
    if (user) {
      const updatedUser = { ...user, profileImage: uri };
      setUser(updatedUser);
      await AsyncStorage.setItem('@tunjuelito_user', JSON.stringify(updatedUser));
      
      // Actualizar también en la lista general de usuarios guardados
      try {
        const storedUsers = await AsyncStorage.getItem('@tunjuelito_registered_users');
        if (storedUsers) {
          let usersList: any[] = JSON.parse(storedUsers);
          usersList = usersList.map(u => u.email === user.email ? { ...u, profileImage: uri } : u);
          await AsyncStorage.setItem('@tunjuelito_registered_users', JSON.stringify(usersList));
        }
      } catch (e) {
        console.log('Error al actualizar foto en lista', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfileImage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}