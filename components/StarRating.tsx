import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface StarRatingProps {
  rating: number | null;
  size?: number;
  readonly?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({
  rating,
  size = 24,
  readonly = false,
  onRate,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (value: number) => {
    if (!readonly && onRate) {
      onRate(value);
    }
  };

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Text
            style={[
              styles.star,
              { fontSize: size },
              (rating ?? 0) >= star ? styles.starFilled : styles.starEmpty,
            ]}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    lineHeight: undefined,
  },
  starFilled: {
    color: Colors.starFilled,
  },
  starEmpty: {
    color: Colors.starEmpty,
  },
});
