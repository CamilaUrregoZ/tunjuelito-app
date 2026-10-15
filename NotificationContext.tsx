import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Notificacion {
  id: string;
  titulo: string;
  fecha: string;
  detalle: string;
  destinatario: string; // 'todos', 'admin', 'voluntario', o correo
  tipo: 'evento' | 'registro' | 'aviso';
}

interface NotificationContextType {
  notificaciones: Notificacion[];
  agregarNotificacion: (nueva: Omit<Notificacion, 'id' | 'fecha'>) => Promise<void>;
  limpiarNotificaciones: () => Promise<void>;
}

const NOTIF_KEY = '@tunjuelito_notificaciones_v3';

const initialNotifs: Notificacion[] = [
  { 
    id: '1', 
    titulo: 'Bienvenido al Sistema de Voluntariado', 
    fecha: '15 Oct 2026', 
    detalle: 'Recuerda revisar el cronograma de Octubre 2026 e inscribirte en tus turnos de Sede Tunjuelito.',
    destinatario: 'todos',
    tipo: 'aviso' 
  }
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  useEffect(() => {
    async function loadNotifs() {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_KEY);
        if (stored) {
          setNotificaciones(JSON.parse(stored));
        } else {
          setNotificaciones(initialNotifs);
          await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(initialNotifs));
        }
      } catch (e) {
        console.log('Error al cargar notificaciones', e);
      }
    }
    loadNotifs();
  }, []);

  const agregarNotificacion = async (nueva: Omit<Notificacion, 'id' | 'fecha'>) => {
    try {
      const nuevaNotif: Notificacion = {
        ...nueva,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fecha: '15 Oct 2026'
      };

      // Recuperamos la lista más reciente directamente de AsyncStorage
      const stored = await AsyncStorage.getItem(NOTIF_KEY);
      const listaActual: Notificacion[] = stored ? JSON.parse(stored) : initialNotifs;

      const actualizadas = [nuevaNotif, ...listaActual];
      
      // Actualizamos estado local y almacenamiento persistente al tiempo
      setNotificaciones(actualizadas);
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(actualizadas));
    } catch (e) {
      console.log('Error al agregar notificación', e);
    }
  };

  const limpiarNotificaciones = async () => {
    try {
      setNotificaciones(initialNotifs);
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(initialNotifs));
    } catch (e) {
      console.log('Error al limpiar notificaciones', e);
    }
  };

  return (
    <NotificationContext.Provider value={{ notificaciones, agregarNotificacion, limpiarNotificaciones }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  return context;
}