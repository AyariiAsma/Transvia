import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/api.client';
import { useAuthStore } from '@/stores/auth.store';
import { ChevronLeft, User, Car, FileText, Check } from 'lucide-react-native';

type Step = 'personal' | 'vehicle' | 'documents' | 'confirm';

const STEPS: { key: Step; label: string; icon: typeof User }[] = [
  { key: 'personal', label: 'Informations', icon: User },
  { key: 'vehicle', label: 'Véhicule', icon: Car },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'confirm', label: 'Confirmation', icon: Check },
];

const VEHICLE_TYPES = [
  { id: 'vt-1', name: 'VTC Standard', emoji: '🚗', desc: 'Berline confort · 4 places' },
  { id: 'vt-2', name: 'VTC Premium', emoji: '🚙', desc: 'Berline premium · 4 places' },
  { id: 'vt-3', name: 'VTC XL', emoji: '🚐', desc: 'Monospace · 6 places' },
];

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vehicleTypeId: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  vehicleColor: string;
}

export default function DriverRegisterScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    vehicleTypeId: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear().toString(),
    vehiclePlate: '',
    vehicleColor: '',
  });

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const goNext = () => {
    const steps: Step[] = ['personal', 'vehicle', 'documents', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const goPrev = () => {
    const steps: Step[] = ['personal', 'vehicle', 'documents', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else router.back();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/driver/register', {
        vehicleTypeId: form.vehicleTypeId,
        vehicleBrand: form.vehicleBrand,
        vehicleModel: form.vehicleModel,
        vehicleYear: parseInt(form.vehicleYear),
        vehiclePlate: form.vehiclePlate,
        vehicleColor: form.vehicleColor,
      });
      Alert.alert(
        '✅ Inscription envoyée',
        'Votre dossier est en cours d\'examen. Vous serez notifié dans 24-48h.',
        [{ text: 'OK', onPress: () => router.replace('/(driver)/home') }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} style={styles.backBtn}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inscription Chauffeur</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone = i < currentStepIndex;
          const Icon = s.icon;
          return (
            <React.Fragment key={s.key}>
              <View style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isDone && styles.stepCircleDone,
                ]}>
                  {isDone
                    ? <Check size={14} color="#fff" />
                    : <Icon size={14} color={isActive ? '#fff' : '#94a3b8'} />}
                </View>
                <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>
                  {s.label}
                </Text>
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Step 1 — Personal */}
        {step === 'personal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vos informations personnelles</Text>
            {[
              { label: 'Prénom', field: 'firstName' as const, placeholder: 'Votre prénom' },
              { label: 'Nom', field: 'lastName' as const, placeholder: 'Votre nom' },
              { label: 'Téléphone', field: 'phone' as const, placeholder: '+216 XX XXX XXX', keyboardType: 'phone-pad' as const },
              { label: 'Email', field: 'email' as const, placeholder: 'votre@email.com', keyboardType: 'email-address' as const },
            ].map((f) => (
              <View key={f.field} style={styles.formGroup}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.field]}
                  onChangeText={(v) => update(f.field, v)}
                  placeholder={f.placeholder}
                  placeholderTextColor="#94a3b8"
                  keyboardType={f.keyboardType}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>
        )}

        {/* Step 2 — Vehicle */}
        {step === 'vehicle' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votre véhicule</Text>

            <Text style={styles.label}>Type de véhicule</Text>
            {VEHICLE_TYPES.map((vt) => (
              <TouchableOpacity
                key={vt.id}
                style={[styles.vehicleCard, form.vehicleTypeId === vt.id && styles.vehicleCardSelected]}
                onPress={() => update('vehicleTypeId', vt.id)}
              >
                <Text style={styles.vehicleEmoji}>{vt.emoji}</Text>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{vt.name}</Text>
                  <Text style={styles.vehicleDesc}>{vt.desc}</Text>
                </View>
                {form.vehicleTypeId === vt.id && (
                  <View style={styles.checkCircle}>
                    <Check size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.row}>
              {[
                { label: 'Marque', field: 'vehicleBrand' as const, placeholder: 'Ex: Toyota', flex: 1 },
                { label: 'Modèle', field: 'vehicleModel' as const, placeholder: 'Ex: Corolla', flex: 1 },
              ].map((f) => (
                <View key={f.field} style={[styles.formGroup, { flex: f.flex, marginRight: f.field === 'vehicleBrand' ? 8 : 0 }]}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput style={styles.input} value={form[f.field]} onChangeText={(v) => update(f.field, v)} placeholder={f.placeholder} placeholderTextColor="#94a3b8" />
                </View>
              ))}
            </View>

            <View style={styles.row}>
              {[
                { label: 'Année', field: 'vehicleYear' as const, placeholder: '2022', kbType: 'numeric' as const, flex: 1 },
                { label: 'Immatriculation', field: 'vehiclePlate' as const, placeholder: '123 TU 456', flex: 2 },
              ].map((f) => (
                <View key={f.field} style={[styles.formGroup, { flex: f.flex, marginRight: f.field === 'vehicleYear' ? 8 : 0 }]}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput style={styles.input} value={form[f.field]} onChangeText={(v) => update(f.field, v)} placeholder={f.placeholder} placeholderTextColor="#94a3b8" keyboardType={f.kbType} />
                </View>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Couleur</Text>
              <TextInput style={styles.input} value={form.vehicleColor} onChangeText={(v) => update('vehicleColor', v)} placeholder="Ex: Blanc" placeholderTextColor="#94a3b8" />
            </View>
          </View>
        )}

        {/* Step 3 — Documents */}
        {step === 'documents' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents requis</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📸 Prenez des photos claires de chaque document. Les fichiers acceptés : JPG, PNG (max 10 MB).</Text>
            </View>
            {[
              { emoji: '🪪', label: 'Permis de conduire', desc: 'Recto et verso' },
              { emoji: '📋', label: 'Carte grise', desc: 'Document d\'immatriculation' },
              { emoji: '🛡️', label: 'Assurance', desc: 'Attestation en cours de validité' },
              { emoji: '🪪', label: 'Pièce d\'identité', desc: 'CIN ou passeport' },
              { emoji: '📸', label: 'Photo de profil', desc: 'Photo récente, fond neutre' },
            ].map((doc) => (
              <TouchableOpacity key={doc.label} style={styles.docCard}>
                <Text style={styles.docEmoji}>{doc.emoji}</Text>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docDesc}>{doc.desc}</Text>
                </View>
                <View style={styles.uploadBtn}>
                  <Text style={styles.uploadBtnText}>Ajouter</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.skipNote}>Vous pouvez ajouter les documents plus tard depuis votre profil chauffeur.</Text>
          </View>
        )}

        {/* Step 4 — Confirm */}
        {step === 'confirm' && (
          <View style={styles.section}>
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmEmoji}>🎉</Text>
              <Text style={styles.confirmTitle}>Presque terminé !</Text>
              <Text style={styles.confirmSub}>Vérifiez vos informations avant d'envoyer votre dossier.</Text>
            </View>

            {[
              { label: 'Nom complet', value: `${form.firstName} ${form.lastName}` },
              { label: 'Téléphone', value: form.phone },
              { label: 'Email', value: form.email },
              { label: 'Type de véhicule', value: VEHICLE_TYPES.find(v => v.id === form.vehicleTypeId)?.name || '—' },
              { label: 'Véhicule', value: `${form.vehicleBrand} ${form.vehicleModel} (${form.vehicleYear})` },
              { label: 'Immatriculation', value: form.vehiclePlate || '—' },
            ].map((item) => (
              <View key={item.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}

            <View style={styles.termsBox}>
              <Text style={styles.termsText}>
                En soumettant, vous acceptez les{' '}
                <Text style={styles.termsLink}>Conditions d'utilisation</Text> et la{' '}
                <Text style={styles.termsLink}>Politique de confidentialité</Text> de LogisticApp.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {step !== 'confirm' ? (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>Continuer →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.submitBtn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>✅ Soumettre mon dossier</Text>}
          </TouchableOpacity>
        )}
      </View>
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

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: '#4F46E5' },
  stepCircleDone: { backgroundColor: '#10b981' },
  stepLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  stepLabelActive: { color: '#4F46E5', fontWeight: '700' },
  stepLine: { flex: 1, height: 1.5, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#10b981' },

  content: { flex: 1 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 20 },

  formGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  row: { flexDirection: 'row' },

  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
    padding: 14, marginBottom: 10,
  },
  vehicleCardSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  vehicleEmoji: { fontSize: 24 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  vehicleDesc: { fontSize: 12, color: '#64748b', marginTop: 1 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },

  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, marginBottom: 10,
  },
  docEmoji: { fontSize: 24 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  docDesc: { fontSize: 12, color: '#64748b', marginTop: 1 },
  uploadBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 10 },
  uploadBtnText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  infoBox: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginBottom: 14 },
  infoText: { fontSize: 12, color: '#854d0e', lineHeight: 18 },
  skipNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 16 },

  confirmHeader: { alignItems: 'center', marginBottom: 24 },
  confirmEmoji: { fontSize: 48, marginBottom: 12 },
  confirmTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  confirmSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  summaryLabel: { fontSize: 13, color: '#64748b' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', textAlign: 'right', flex: 1, marginLeft: 12 },

  termsBox: { marginTop: 16, padding: 14, backgroundColor: '#f8fafc', borderRadius: 12 },
  termsText: { fontSize: 12, color: '#64748b', lineHeight: 18, textAlign: 'center' },
  termsLink: { color: '#4F46E5', fontWeight: '600' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  nextBtn: {
    backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  submitBtn: { backgroundColor: '#10b981' },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
});
