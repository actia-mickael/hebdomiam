import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface TabBarProps {
  currentIndex: number;
  onTabPress: (index: number) => void;
}

const TABS = [
  { icon: '🎲', label: 'Générateur' },
  { icon: '📅', label: 'Semaine' },
  { icon: '📖', label: 'Livre' },
  { icon: '📊', label: 'Stats' },
];

export default function TabBar({ currentIndex, onTabPress }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 6 }]}>
      {TABS.map((tab, index) => {
        const active = currentIndex === index;
        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => onTabPress(index)}
            activeOpacity={0.65}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Text style={styles.icon}>{tab.icon}</Text>
              {active && (
                <Text style={styles.pillLabel} numberOfLines={1}>
                  {tab.label}
                </Text>
              )}
            </View>
            {!active && (
              <Text style={styles.label} numberOfLines={1}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingTop: 10,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#1B3B6F',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 52,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    marginBottom: 3,
  },
  pillActive: {
    backgroundColor: Colors.primarySurface,
  },
  icon: {
    fontSize: 20,
  },
  pillLabel: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  label: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
});
