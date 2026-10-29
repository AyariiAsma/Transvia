import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, Dimensions, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { login, loginWithOtp } = useAuthStore();

  const [mode, setMode] = useState<'welcome' | 'login' | 'phone'>('welcome');
  const [phone, setPhone] = useState('+216');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode: 'login' | 'phone') => {
    setMode(newMode);
    setError(null);
    Animated.spring(slideAnim, {
      toValue: newMode === 'login' ? 0 : 1,
      useNativeDriver: true,
      tension: 65, friction: 10,
    }).start();
  };

  const handlePasswordLogin = async () => {
    if (!email && !phone.replace('+216', '')) return;
    if (!password) return;

    setIsLoading(true);
    setError(null);
    try {
      await login(email || phone, password);
      // Navigation gérée par le root layout
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'client' | 'driver' | 'admin') => {
    setIsLoading(true);
    const demos = {
      client: { email: 'client@demo.com', password: 'Demo@1234' },
      driver: { email: 'chauffeur@demo.com', password: 'Demo@1234' },
      admin: { email: 'admin@demo.com', password: 'Demo@1234' },
    };
    try {
      await login(demos[role].email, demos[role].password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#1e1b4b']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Décorations */}
      <View style={[styles.circle, { top: -80, right: -80, opacity: 0.12 }]} />
      <View style={[styles.circle, { bottom: 200, left: -100, width: 280, height: 280, opacity: 0.08 }]} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>🚗</Text>
              </View>
              <Text style={styles.appName}>LogisticApp</Text>
              <Text style={styles.appTagline}>Transport & Livraison à la demande</Text>
              <View style={styles.countries}>
                {['🇹🇳', '🇩🇿', '🇲🇦'].map((flag) => (
                  <Text key={flag} style={styles.flag}>{flag}</Text>
                ))}
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {mode === 'welcome' ? (
                <>
                  <Text style={styles.cardTitle}>Bienvenue</Text>
                  <Text style={styles.cardSubtitle}>
                    Connectez-vous pour accéder à la plateforme
                  </Text>

                  <TouchableOpacity style={styles.btnPrimary} onPress={() => switchMode('login')}>
                    <Text style={styles.btnPrimaryText}>Se connecter</Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>DÉMO RAPIDE</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.demoGrid}>
                    {[
                      { role: 'client', icon: '👤', label: 'Client', color: '#4F46E5' },
                      { role: 'driver', icon: '🚗', label: 'Chauffeur', color: '#10b981' },
                      { role: 'admin', icon: '🛡️', label: 'Admin', color: '#f59e0b' },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.role}
                        style={[styles.demoBtn, { borderColor: d.color }]}
                        onPress={() => handleDemoLogin(d.role as any)}
                        disabled={isLoading}
                      >
                        <Text style={styles.demoIcon}>{d.icon}</Text>
                        <Text style={[styles.demoLabel, { color: d.color }]}>{d.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {isLoading && (
                    <ActivityIndicator color="#4F46E5" size="large" style={{ marginTop: 16 }} />
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setMode('welcome')} style={styles.backBtn}>
                    <Text style={styles.backText}>← Retour</Text>
                  </TouchableOpacity>

                  <Text style={styles.cardTitle}>Connexion</Text>

                  {error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email ou téléphone</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="email@exemple.com"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mot de passe</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                    onPress={handlePasswordLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Se connecter</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
                    <Text style={styles.linkText}>Pas de compte ? <Text style={styles.linkAccent}>S'inscrire</Text></Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  circle: {
    position: 'absolute', width: 240, height: 240,
    borderRadius: 120, backgroundColor: '#fff',
  },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  countries: { flexDirection: 'row', gap: 8, marginTop: 12 },
  flag: { fontSize: 22 },

  card: {
    backgroundColor: '#fff', borderRadius: 28,
    padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25, shadowRadius: 30, elevation: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },

  btnPrimary: {
    backgroundColor: '#4F46E5', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },

  demoGrid: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  demoIcon: { fontSize: 22 },
  demoLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#1e293b', backgroundColor: '#f8fafc',
  },

  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center' },

  backBtn: { marginBottom: 16 },
  backText: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },

  link: { alignItems: 'center', marginTop: 20 },
  linkText: { fontSize: 14, color: '#64748b' },
  linkAccent: { color: '#4F46E5', fontWeight: '700' },
});
