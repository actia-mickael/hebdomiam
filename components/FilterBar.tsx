import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/colors';

interface FilterOption {
  value: string;
  label: string;
}

// Mode sélection unique (usage existant dans LivrePage)
interface SingleProps {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  selectedValues?: never;
  onToggle?: never;
}

// Mode sélection multiple (GeneratorPage)
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
        {props.options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, isActive(option.value) && styles.optionActive]}
            onPress={() => handlePress(option.value)}
          >
            <Text style={[styles.optionText, isActive(option.value) && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  optionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
