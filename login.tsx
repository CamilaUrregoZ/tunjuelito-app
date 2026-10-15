import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const USERS_KEY = '@tunjuelito_registered_users';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<'voluntario' | 'admin'>('voluntario');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // 1. Registro de Usuario Persistente
  const handleRegister = async () => {
    if (!email || !password || !nombre) {
      Alert.alert('Campos incompletos', 'Por favor completa todos los campos.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      let usersList: any[] = stored ? JSON.parse(stored) : [];

      const existe = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existe) {
        Alert.alert('Usuario existente', 'Este correo ya está registrado. Inicia sesión.');
        return;
      }

      const newUser = { 
        email: email.toLowerCase(), 
        pass: password, 
        nombre, 
        role, 
        profileImage 
      };
      
      usersList.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(usersList));

      Alert.alert('¡Registro Exitoso!', 'Cuenta creada correctamente. Ya puedes iniciar sesión.');
      setIsRegistering(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el registro.');
    }
  };

  // 2. Inicio de Sesión con Validación y Recuperación de Foto
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña.');
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      let usersList: any[] = stored ? JSON.parse(stored) : [];

      const userFound = usersList.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.pass === password
      );

      if (!userFound) {
        Alert.alert('Acceso Denegado', 'Correo o contraseña incorrectos, o no estás registrado.');
        return;
      }

      // Inicia sesión pasando sus datos reales y su foto guardada
      await login({
        nombre: userFound.nombre,
        email: userFound.email,
        role: userFound.role,
        profileImage: userFound.profileImage || null
      });

      Alert.alert('¡Bienvenido!', `Has ingresado como ${userFound.nombre}`);
      router.replace('/tabs');
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un fallo al iniciar sesión.');
    }
  };

  // 3. Autenticación Biométrica (Huella / Face ID)
  const handleBiometricAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      let usersList: any[] = stored ? JSON.parse(stored) : [];

      if (usersList.length === 0) {
        Alert.alert('Sin registros', 'No hay usuarios en la app. Regístrate primero con correo y contraseña.');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometría no disponible', 'No tienes configurada ninguna huella o Face ID.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Inicia sesión con tu Huella o Face ID',
        fallbackLabel: 'Usar contraseña',
      });

      if (result.success) {
        // Toma el último usuario registrado para la biometría
        const lastUser = usersList[usersList.length - 1];
        await login({
          nombre: lastUser.nombre,
          email: lastUser.email,
          role: lastUser.role,
          profileImage: lastUser.profileImage || null
        });
        router.replace('/tabs');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un fallo en la autenticación biométrica.');
    }
  };

  // 4. Selección NATIVA de Foto de Perfil
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Ionicons name="calendar-sharp" size={50} color="#007AFF" style={styles.logo} />
        <Text style={styles.title}>Sede Tunjuelito</Text>
        <Text style={styles.subtitle}>{isRegistering ? 'Crear nueva cuenta' : 'Ingreso al Sistema'}</Text>

        {/* Foto de Perfil Nativa (Solo en Registro) */}
        {isRegistering && (
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera-outline" size={28} color="#007AFF" />
                <Text style={styles.avatarText}>Foto de perfil</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Formulario */}
        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Nombre Completo"
            value={nombre}
            onChangeText={setNombre}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Selección de Rol (Solo en Registro) */}
        {isRegistering && (
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Rol:</Text>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'voluntario' && styles.roleActive]}
              onPress={() => setRole('voluntario')}
            >
              <Text style={[styles.roleText, role === 'voluntario' && styles.roleTextActive]}>Voluntario</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'admin' && styles.roleActive]}
              onPress={() => setRole('admin')}
            >
              <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón Principal */}
        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={isRegistering ? handleRegister : handleLogin}
        >
          <Text style={styles.btnPrimaryText}>
            {isRegistering ? 'Registrarme' : 'Iniciar Sesión'}
          </Text>
        </TouchableOpacity>

        {/* Botón de Autenticación Biométrica */}
        {!isRegistering && (
          <TouchableOpacity style={styles.btnBiometric} onPress={handleBiometricAuth}>
            <Ionicons name="finger-print-outline" size={24} color="#007AFF" />
            <Text style={styles.btnBiometricText}>Ingresar con Huella / Face ID</Text>
          </TouchableOpacity>
        )}

        {/* Alternar Vista */}
        <TouchableOpacity 
          style={styles.btnSwitch} 
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.btnSwitchText}>
            {isRegistering 
              ? '¿Ya tienes cuenta? Inicia Sesión' 
              : '¿No tienes cuenta? Regístrate aquí'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F4F6F8' },
  card: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, elevation: 3, alignItems: 'center' },
  logo: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#6C757D', marginBottom: 20 },
  input: { width: '100%', height: 48, borderWidth: 1, borderColor: '#CED4DA', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, backgroundColor: '#FAFAFA' },
  roleContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  roleLabel: { fontWeight: 'bold', marginRight: 10, fontSize: 14 },
  roleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#E9ECEF', marginHorizontal: 4 },
  roleActive: { backgroundColor: '#007AFF' },
  roleText: { fontSize: 12, color: '#333' },
  roleTextActive: { color: '#FFF', fontWeight: 'bold' },
  btnPrimary: { width: '100%', backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnBiometric: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 10, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, width: '100%' },
  btnBiometricText: { color: '#007AFF', fontWeight: '600', marginLeft: 8, fontSize: 14 },
  btnSwitch: { marginTop: 20 },
  btnSwitchText: { color: '#6C757D', fontSize: 13, textDecorationLine: 'underline' },
  imagePicker: { marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#007AFF' },
  avatarText: { fontSize: 10, color: '#007AFF', marginTop: 4 }
});