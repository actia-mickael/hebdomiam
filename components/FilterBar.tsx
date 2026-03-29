import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface FilterOption {
  value: string;
  label: string;
}

interface SingleProps {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  selectedValues?: never;
  onToggle?: never;
}

interface MultiProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  selected?: never;
  onSelect?: never;
}

type FilterBarProps = SingleProps | MultiProps;

export default function FilterBar(props: FilterBarProps) {
  const isActive = (value: string) =>
    props.selectedValues !== undefined
      ? props.selectedValues.includes(value)
      : props.selected === value;

  const handlePress = (value: string) =>
    props.onToggle ? props.onToggle(value) : props.onSelect?.(value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{props.label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {props.options.map((option) => {
          const active = isActive(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => handlePress(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
