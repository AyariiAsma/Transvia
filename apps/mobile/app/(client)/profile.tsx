import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/services/api.client';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import {
  ChevronLeft, ChevronRight, User, Phone, Mail, Globe,
  Bell, Shield, HelpCircle, LogOut, Edit2, Star, Car,
} from 'lucide-react-native';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [form, setForm] = useState({
    firstName: user?.firstName || 'Utilisateur',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch('/users/me', form);
      setIsEditing(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter', style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const handleLanguageChange = (code: string) => {
    changeLanguage(code as 'fr' | 'ar' | 'en');
  };

  const initials = `${form.firstName[0] || ''}${form.lastName[0] || ''}`.toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          style={styles.editBtn}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#4F46E5" />
            : <Text style={styles.editBtnText}>{isEditing ? 'Sauver' : 'Modifier'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>Changer la photo</Text>
            </TouchableOpacity>
          )}
          {!isEditing && (
            <>
              <Text style={styles.userName}>{form.firstName} {form.lastName}</Text>
              <View style={styles.userRoleBadge}>
                <Text style={styles.userRoleText}>
                  {user?.role === 'DRIVER' ? '🚗 Chauffeur' : '👤 Client'}
                </Text>
              </View>
              {user?.role === 'DRIVER' && (
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={16} color={i <= 4 ? '#f59e0b' : '#e2e8f0'} fill={i <= 4 ? '#f59e0b' : 'transparent'} />
                  ))}
                  <Text style={styles.ratingText}>4.8</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Personal info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          {[
            { label: 'Prénom', field: 'firstName' as const, icon: User },
            { label: 'Nom', field: 'lastName' as const, icon: User },
            { label: 'Email', field: 'email' as const, icon: Mail, keyboardType: 'email-address' as const },
            { label: 'Téléphone', field: 'phone' as const, icon: Phone, keyboardType: 'phone-pad' as const },
          ].map(({ label, field, icon: Icon, keyboardType }) => (
            <View key={field} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon size={15} color="#64748b" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={form[field]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.infoValue}>{form[field] || '—'}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Driver specific */}
        {user?.role === 'DRIVER' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes courses</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(driver)/earnings' as any)}>
              <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                <Text>💰</Text>
              </View>
              <Text style={styles.menuLabel}>Mes gains</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(driver)/documents' as any)}>
              <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                <Text>📄</Text>
              </View>
              <Text style={styles.menuLabel}>Mes documents</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Client specific */}
        {user?.role === 'CLIENT' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mon compte</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/ride-history' as any)}>
              <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                <Car size={18} color="#10b981" />
              </View>
              <Text style={styles.menuLabel}>Historique des courses</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(client)/wallet' as any)}>
              <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
                <Text>💳</Text>
              </View>
              <Text style={styles.menuLabel}>Mon wallet</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>

          {/* Notifications toggle */}
          <View style={styles.preferenceRow}>
            <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
              <Bell size={16} color="#4F46E5" />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#e2e8f0', true: '#4F46E5' }}
              thumbColor="#fff"
            />
          </View>

          {/* Language */}
          <View style={styles.langSection}>
            <View style={styles.preferenceRow}>
              <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                <Globe size={16} color="#10b981" />
              </View>
              <Text style={styles.menuLabel}>Langue</Text>
            </View>
            <View style={styles.langRow}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langBtn, i18n.language === lang.code && styles.langBtnActive]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langLabel, i18n.language === lang.code && styles.langLabelActive]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Help & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aide & Légal</Text>
          {[
            { icon: '🆘', label: 'Centre d\'aide', onPress: () => {} },
            { icon: '🛡️', label: 'Confidentialité', onPress: () => {} },
            { icon: '📋', label: 'Conditions d\'utilisation', onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: '#f8fafc' }]}>
                <Text>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={[styles.section, { paddingBottom: 8 }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#ef4444" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>LogisticApp v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#EEF2FF', borderRadius: 10 },
  editBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  avatarSection: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  changePhotoBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 10 },
  changePhotoText: { color: '#4F46E5', fontSize: 13, fontWeight: '600' },
  userName: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  userRoleBadge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#EEF2FF', borderRadius: 20 },
  userRoleText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 },
  ratingText: { fontSize: 14, fontWeight: '700', color: '#f59e0b', marginLeft: 4 },

  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  infoInput: {
    fontSize: 14, color: '#1e293b', fontWeight: '500',
    borderBottomWidth: 1.5, borderBottomColor: '#4F46E5',
    paddingVertical: 2,
  },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1e293b' },

  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  langSection: {},
  langRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginLeft: 48 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  langBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  langFlag: { fontSize: 16 },
  langLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  langLabelActive: { color: '#4F46E5' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  version: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 16 },
});
