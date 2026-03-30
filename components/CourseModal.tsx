import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Recipe } from '@/types/recipe';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

interface ShoppingItem {
  name: string;
  count: number;
  checked: boolean;
  manual: boolean;  // true = ajouté manuellement par l'utilisateur
}

function buildShoppingList(recipes: Recipe[]): ShoppingItem[] {
  const map = new Map<string, number>();

  for (const recipe of recipes) {
    const ingredients = [
      recipe.mainIngredient,
      ...recipe.ingredients,
    ].filter(i => i?.trim());

    for (const ing of ingredients) {
      const key = ing.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      checked: true,
      manual: false,
    }))
    .sort((a, b) => a.name.localeCompare(b, 'fr'));
}

function buildPdfHtml(items: ShoppingItem[], recipeNames: string[]): string {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const rows = items
    .map(
      item => `
      <tr${item.manual ? ' class="manual"' : ''}>
        <td>${item.name}${item.manual ? ' <span class="tag">+</span>' : ''}</td>
        <td class="qty">${item.count > 1 ? `×${item.count}` : ''}</td>
        <td class="check">☐</td>
      </tr>`
    )
    .join('');

  const recipeList = recipeNames.map(n => `<li>${n}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #1A237E; }
    header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    header h1 { font-size: 26px; color: #0288D1; }
    .date { font-size: 13px; color: #5C6BC0; margin-bottom: 24px; }
    .recipes { background: #E3F2FD; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
    .recipes h2 { font-size: 14px; color: #0288D1; margin-bottom: 6px; }
    .recipes ul { padding-left: 18px; font-size: 13px; color: #1A237E; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #0288D1; color: white; }
    thead th { padding: 10px 14px; text-align: left; font-size: 13px; font-weight: 600; }
    thead th.qty { width: 60px; text-align: center; }
    thead th.check { width: 50px; text-align: center; }
    tbody tr:nth-child(even) { background: #F5FBFF; }
    tbody tr:nth-child(odd) { background: #FFFFFF; }
    tbody tr.manual td { font-style: italic; color: #0277BD; }
    tbody td { padding: 9px 14px; font-size: 14px; border-bottom: 1px solid #B3E5FC; }
    tbody td.qty { text-align: center; color: #5C6BC0; font-size: 12px; }
    tbody td.check { text-align: center; font-size: 16px; }
    .tag { background: #E3F2FD; color: #0288D1; font-size: 10px; padding: 1px 5px; border-radius: 4px; font-style: normal; }
    footer { margin-top: 24px; text-align: center; font-size: 11px; color: #90A4AE; }
  </style>
</head>
<body>
  <header>
    <span style="font-size:32px">🛒</span>
    <h1>Liste de courses</h1>
  </header>
  <p class="date">${today}</p>

  ${recipeNames.length > 0 ? `
  <div class="recipes">
    <h2>Recettes de la semaine</h2>
    <ul>${recipeList}</ul>
  </div>` : ''}

  <table>
    <thead>
      <tr>
        <th>Ingrédient</th>
        <th class="qty">Qté</th>
        <th class="check">✓</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <footer>Généré par HebdoMiam</footer>
</body>
</html>`;
}

interface Props {
  visible: boolean;
  recipes: Recipe[];
  onClose: () => void;
}

export default function CourseModal({ visible, recipes, onClose }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleShow = () => {
    setItems(buildShoppingList(recipes));
    setInputValue('');
  };

  const toggleItem = (index: number) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    const name = inputValue.trim();
    if (!name) return;

    const key = name.toLowerCase();
    const existing = items.findIndex(i => i.name.toLowerCase() === key);

    if (existing >= 0) {
      // Ingrédient déjà présent : incrémenter la quantité
      setItems(prev =>
        prev.map((item, i) =>
          i === existing ? { ...item, count: item.count + 1, checked: true } : item
        )
      );
    } else {
      const newItem: ShoppingItem = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: 1,
        checked: true,
        manual: true,
      };
      setItems(prev => {
        const updated = [...prev, newItem];
        return updated.sort((a, b) => a.name.localeCompare(b, 'fr'));
      });
    }

    setInputValue('');
    inputRef.current?.focus();
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const html = buildPdfHtml(items, recipes.map(r => r.name));
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Liste de courses',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF généré', uri);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>🛒 Liste de courses</Text>
              <Text style={styles.subtitle}>
                {checkedCount}/{items.length} ingrédients
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.printBtn}
                onPress={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.printBtnText}>🖨️ Print</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Saisie manuelle */}
          <View style={styles.addRow}>
            <TextInput
              ref={inputRef}
              style={styles.addInput}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Ajouter un ingrédient..."
              placeholderTextColor={Colors.textLight}
              returnKeyType="done"
              onSubmitEditing={addManualItem}
              autoCapitalize="sentences"
            />
            <TouchableOpacity
              style={[styles.addBtn, !inputValue.trim() && styles.addBtnDisabled]}
              onPress={addManualItem}
              disabled={!inputValue.trim()}
            >
              <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
          </View>

          {/* Tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colIngredient, styles.colHeaderText]}>Ingrédient</Text>
            <Text style={[styles.colQty, styles.colHeaderText]}>Qté</Text>
            <Text style={[styles.colCheck, styles.colHeaderText]}>✓</Text>
            <View style={styles.colDelete} />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>Aucun ingrédient trouvé</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <TouchableOpacity
                  key={`${item.name}-${index}`}
                  style={[
                    styles.row,
                    index % 2 === 0 ? styles.rowEven : styles.rowOdd,
                    item.manual && styles.rowManual,
                  ]}
                  onPress={() => toggleItem(index)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.colIngredient,
                      styles.rowText,
                      item.manual && styles.rowTextManual,
                      !item.checked && styles.textStriken,
                    ]}
                    numberOfLines={1}
                  >
                    {item.manual ? '+ ' : ''}{item.name}
                  </Text>
                  <Text style={[styles.colQty, styles.qtyText]}>
                    {item.count > 1 ? `×${item.count}` : ''}
                  </Text>
                  <View style={styles.colCheck}>
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                  {item.manual ? (
                    <TouchableOpacity
                      style={styles.colDelete}
                      onPress={() => removeItem(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.colDelete} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <View style={styles.listBottom} />
          </ScrollView>

          {/* Pied : recettes sources */}
          {recipes.length > 0 && (
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Recettes :</Text>
              <Text style={styles.footerRecipes} numberOfLines={2}>
                {recipes.map(r => r.name).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    ...Shadows.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  printBtn: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  printBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundAlt,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.border,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 26,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryDark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  colHeaderText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  colIngredient: {
    flex: 1,
  },
  colQty: {
    width: 44,
    textAlign: 'center',
  },
  colCheck: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colDelete: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  listBottom: {
    height: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
  },
  rowEven: {
    backgroundColor: Colors.surface,
  },
  rowOdd: {
    backgroundColor: Colors.surfaceAlt,
  },
  rowManual: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  rowText: {
    fontSize: 15,
    color: Colors.text,
  },
  rowTextManual: {
    color: Colors.primaryDark,
    fontStyle: 'italic',
  },
  textStriken: {
    textDecorationLine: 'line-through',
    color: Colors.textLight,
  },
  qtyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.backgroundAlt,
  },
  footerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  footerRecipes: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
