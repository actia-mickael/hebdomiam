import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Clipboard,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  createFamily, joinFamily, leaveFamily,
  getFamily, getFamilyMembers, removeMember,
} from '@/services/authService';
import { uploadLocalRecipes, syncDown } from '@/services/syncService';
import { Family, FamilyMember } from '@/types/recipe';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/colors';

export default function FamilleScreen() {
  const { session, profile, isAdmin, refreshProfile } = useAuth();
  const userId = session?.user?.id ?? '';

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulaires
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const loadFamily = useCallback(async () => {
    if (!profile?.familyId) { setLoading(false); return; }
    try {
      const [fam, mem] = await Promise.all([
        getFamily(profile.familyId),
        getFamilyMembers(profile.familyId),
      ]);
      setFamily(fam);
      setMembers(mem);
    } catch { }
    setLoading(false);
  }, [profile?.familyId]);

  useEffect(() => { loadFamily(); }, [loadFamily]);

  const handleCreate = async () => {
    if (!familyName.trim()) { Alert.alert('Erreur', 'Entrez un nom de famille'); return; }
    setActionLoading(true);
    try {
      const fam = await createFamily(familyName.trim(), userId);
      // Afficher le code immédiatement, uploader les recettes en arrière-plan
      await Promise.all([refreshProfile(), loadFamily()]);
      Alert.alert('✅ Famille créée', `Code d'invitation : ${fam.inviteCode}`);
      uploadLocalRecipes(fam.id, userId).catch(() => {});
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { Alert.alert('Erreur', 'Entrez le code famille'); return; }
    setActionLoading(true);
    try {
      const fam = await joinFamily(inviteCode.trim(), userId);
      await Promise.all([refreshProfile(), loadFamily()]);
      Alert.alert('✅ Famille rejointe', `Bienvenue dans "${fam.name}" !`);
      // Sync en arrière-plan
      syncDown(fam.id).catch(() => {});
      uploadLocalRecipes(fam.id, userId).catch(() => {});
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de rejoindre');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Quitter la famille ?',
      'Vous perdrez accès aux recettes partagées. Vos recettes locales resteront.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveFamily(userId);
              await refreshProfile();
              setFamily(null);
              setMembers([]);
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de quitter');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      `Retirer ${member.display_name} ?`,
      'Ce membre perdra accès aux recettes partagées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(member.id);
              setMembers(prev => prev.filter(m => m.id !== member.id));
            } catch {
              Alert.alert('Erreur', 'Impossible de retirer ce membre');
            }
          },
        },
      ]
    );
  };

  const copyCode = () => {
    if (family?.inviteCode) {
      Clipboard.setString(family.inviteCode);
      Alert.alert('Copié !', `Code "${family.inviteCode}" copié dans le presse-papier.`);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: '👨‍👩‍👧 Famille' }} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </>
    );
  }

  // ── Pas encore de famille ─────────────────────────────────────────────
  if (!profile?.familyId) {
    return (
      <>
        <Stack.Screen options={{ title: '👨‍👩‍👧 Famille' }} />
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Rejoindre ou créer une famille</Text>
          <Text style={styles.pageSubtitle}>
            Partagez vos recettes et votre planning avec votre famille.
          </Text>

          {/* Créer */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👑 Créer une famille</Text>
            <Text style={styles.cardDesc}>
              Vous serez l'administrateur. Vos recettes seront uploadées dans la famille.
            </Text>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="Nom de la famille (ex : Les Dupont)"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.btnPrimary, actionLoading && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnPrimaryText}>Créer la famille</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Rejoindre */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔗 Rejoindre une famille</Text>
            <Text style={styles.cardDesc}>
              Demandez le code d'invitation à l'administrateur de votre famille.
            </Text>
            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Code à 6 caractères (ex : A3F9B2)"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.btnSecondary, actionLoading && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color={Colors.primaryDark} />
                : <Text style={styles.btnSecondaryText}>Rejoindre la famille</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  }

  // ── Dans une famille ──────────────────────────────────────────────────
  const roleBadge = isAdmin ? '👑 Administrateur' : '👤 Membre';

  return (
    <>
      <Stack.Screen options={{ title: '👨‍👩‍👧 Famille' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Infos famille */}
        <View style={styles.card}>
          <View style={styles.familyHeader}>
            <View>
              <Text style={styles.familyName}>{family?.name ?? '—'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleBadge}</Text>
              </View>
            </View>
            <Text style={styles.familyEmoji}>👨‍👩‍👧</Text>
          </View>

          {/* Code invitation (admin seulement) */}
          {isAdmin && family && (
            <TouchableOpacity style={styles.codeBox} onPress={copyCode}>
              <View>
                <Text style={styles.codeLabel}>Code d'invitation</Text>
                <Text style={styles.codeValue}>{family.inviteCode}</Text>
              </View>
              <Text style={styles.codeCopy}>📋 Copier</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Membres */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Membres ({members.length})</Text>
          {members.map(member => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.display_name || '—'}</Text>
                <Text style={styles.memberRole}>
                  {member.role === 'admin' ? '👑 Admin' : '👤 Membre'}
                </Text>
              </View>
              {/* Admin peut retirer les autres membres */}
              {isAdmin && member.id !== userId && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Quitter */}
        <TouchableOpacity
          style={[styles.btnDanger, actionLoading && styles.btnDisabled]}
          onPress={handleLeave}
          disabled={actionLoading}
        >
          <Text style={styles.btnDangerText}>
            {isAdmin ? '🚪 Dissoudre la famille' : '🚪 Quitter la famille'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.leaveNote}>
          {isAdmin
            ? 'Dissoudre la famille retirera tous les membres. Les recettes locales sont conservées.'
            : 'Quitter la famille ne supprime pas vos recettes locales.'}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  pageSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  input: {
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  btnPrimary: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
  },
  btnSecondaryText: { color: Colors.primaryDark, fontSize: 15, fontWeight: '600' },
  btnDanger: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
    marginTop: Spacing.sm,
  },
  btnDangerText: { color: Colors.error, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  familyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  familyName: { fontSize: 20, fontWeight: '700', color: Colors.text },
  familyEmoji: { fontSize: 40 },
  roleBadge: {
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
  codeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  codeLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  codeValue: { fontSize: 24, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 4 },
  codeCopy: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.error + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  leaveNote: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16 },
});
