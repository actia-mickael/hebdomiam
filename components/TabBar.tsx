import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadows, Spacing, BorderRadius } from '@/constants/colors';

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
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.tab, currentIndex === index && styles.tabActive]}
          onPress={() => onTabPress(index)}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text
            style={[
              styles.label,
              currentIndex === index && styles.labelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    ...Shadows.small,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    marginTop: -3,
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
});