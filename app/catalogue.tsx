import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';
import { CloudBook, RecipeBook } from '@/types/recipe';
import { fetchCloudCatalog, downloadBook, deleteLocalBook } from '@/services/cloudService';
import { getAllBooks, exportBookToJson, toggleBookActive } from '@/services/database';
import { isSupabaseConfigured } from '@/config/supabase';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

export default function CatalogueScreen() {
  const [cloudBooks, setCloudBooks] = useState<CloudBook[]>([]);
  const [localBooks, setLocalBooks] = useState<RecipeBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cloud, local] = await Promise.all([
        fetchCloudCatalog(),
        getAllBooks(),
      ]);
      setCloudBooks(cloud);
      setLocalBooks(local);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const isDownloaded = (cloudId: string) =>
    localBooks.some(b => b.cloudId === cloudId);

  const getLocalBook = (cloudId: string) =>
    localBooks.find(b => b.cloudId === cloudId) ?? null;

  const handleDownload = async (book: CloudBook) => {
    setDownloading(book.id);
    try {
      const created = await downloadBook(book);
      const local = await getAllBooks();
      setLocalBooks(local);
      Alert.alert(
        '✅ Téléchargé',
        `"${book.name}" ajouté à votre bibliothèque.\n${created} nouvelle(s) recette(s) importée(s).`
      );
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de télécharger');
    } finally {
      setDownloading(null);
    }
  };

  const handleToggleActive = async (cloudId: string, active: boolean) => {
    const local = getLocalBook(cloudId);
    if (!local) return;
    try {
      await toggleBookActive(local.id, active);
      setLocalBooks(prev =>
        prev.map(b => b.id === local.id ? { ...b, isActive: active } : b)
      );
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier le statut du livre');
    }
  };

  const handleDelete = (book: CloudBook) => {
    Alert.alert(
      '🗑️ Supprimer la copie ?',
      `Supprimer votre copie de "${book.name}" ?\n\nLes recettes resteront dans votre bibliothèque. Seul le livre sera supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocalBook(book.id);
              setLocalBooks(prev => prev.filter(b => b.cloudId !== book.id));
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleExport = async (cloudId: string) => {
    const local = getLocalBook(cloudId);
    if (!local) return;
    try {
      const json = await exportBookToJson(local.id);
      const path = `${FileSystem.cacheDirectory}livre_${local.id}_export.json`;
      await FileSystem.writeAsStringAsync(path, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: `Exporter "${local.name}"`,
        });
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'exporter le livre");
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Stack.Screen options={{ title: '📚 Catalogue' }} />
        <View style={styles.centerContainer}>
          <Text style={styles.bigEmoji}>⚙️</Text>
          <Text style={styles.emptyTitle}>Configuration requise</Text>
          <Text style={styles.emptyText}>
            Ajoutez vos clés Supabase dans le fichier{'\n'}
            <Text style={styles.code}>.env</Text> à la racine du projet :
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeLine}>EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co</Text>
            <Text style={styles.codeLine}>EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...</Text>
          </View>
        </View>
      </>
    );
  }

  const renderBook = ({ item }: { item: CloudBook }) => {
    const downloaded = isDownloaded(item.id);
    const local = getLocalBook(item.id);
    const isDownloading = downloading === item.id;

    return (
      <View style={styles.bookCard}>
        <View style={[styles.bookIcon, { backgroundColor: item.color + '22' }]}>
          <Text style={styles.bookIconText}>{item.icon}</Text>
        </View>

        <View style={styles.bookInfo}>
          <View style={styles.bookTitleRow}>
            <Text style={styles.bookName}>{item.name}</Text>
            {downloaded && local?.isModified && (
              <View style={styles.modifiedBadge}>
                <Text style={styles.modifiedBadgeText}>modifié</Text>
              </View>
            )}
          </View>
          <Text style={styles.bookDescription} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.bookMeta}>
            👤 {item.author} · {item.recipe_count} recette(s) · v{item.version}
          </Text>

          <View style={styles.bookActions}>
            {downloaded ? (
              <>
                <View style={styles.useRow}>
                  <Text style={styles.useLabel}>Utiliser</Text>
                  <Switch
                    value={local?.isActive ?? true}
                    onValueChange={v => handleToggleActive(item.id, v)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                    thumbColor={local?.isActive ? Colors.primaryDark : Colors.textLight}
                  />
                </View>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => handleExport(item.id)}
                >
                  <Text style={styles.actionBtnSmallText}>📤</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtnSmall, styles.actionBtnDanger]}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.actionBtnSmallText}>🗑️</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
                onPress={() => handleDownload(item)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.downloadBtnText}>⬇️ Télécharger</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: '📚 Catalogue' }} />
      <View style={styles.container}>
        {error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.bigEmoji}>📡</Text>
            <Text style={styles.emptyTitle}>Impossible de charger</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={cloudBooks}
            keyExtractor={item => item.id}
            renderItem={renderBook}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadData} />
            }
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>
                {cloudBooks.length} livre(s) disponible(s)
              </Text>
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.bigEmoji}>📭</Text>
                  <Text style={styles.emptyTitle}>Aucun livre disponible</Text>
                  <Text style={styles.emptyText}>Le catalogue est vide pour l'instant.</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  bookIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookIconText: {
    fontSize: 28,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  modifiedBadge: {
    backgroundColor: Colors.warning + '22',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modifiedBadgeText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '600',
  },
  bookDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  bookMeta: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  bookActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  useRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  useLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  actionBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    borderColor: Colors.error + '44',
  },
  actionBtnSmallText: {
    fontSize: 16,
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.full,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  bigEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: Colors.backgroundAlt,
    color: Colors.primaryDark,
  },
  codeBlock: {
    marginTop: Spacing.md,
    backgroundColor: Colors.backgroundAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  codeLine: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Colors.text,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
