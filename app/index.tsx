import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getSetting } from '@/services/database';
import GeneratorPage from '@/components/pages/GeneratorPage';
import HistoriquePage from '@/components/pages/HistoriquePage';
import LivrePage from '@/components/pages/LivrePage';
import StatsPage from '@/components/pages/StatsPage';
import TabBar from '@/components/TabBar';

export default function MainScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [recipeCount, setRecipeCount] = useState(3);
  const [preloadedUpTo, setPreloadedUpTo] = useState(-1);

  useEffect(() => {
    const t1 = setTimeout(() => setPreloadedUpTo(1), 300);
    const t2 = setTimeout(() => setPreloadedUpTo(2), 600);
    const t3 = setTimeout(() => setPreloadedUpTo(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSetting('recipe_count', '3').then(v => setRecipeCount(Number(v)));
    }, [])
  );

  const handlePageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  const handleTabPress = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '🍽️ HebdoMiam',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => router.push('/famille')}
                style={styles.settingsBtn}
              >
                <Text style={styles.settingsIcon}>👨‍👩‍👧</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/parametres')}
                style={styles.settingsBtn}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={true}
        offscreenPageLimit={3}
      >
        <View key="1" style={styles.page}>
          <GeneratorPage count={recipeCount} />
        </View>
        <View key="2" style={styles.page}>
          <HistoriquePage isActive={currentPage === 1} preload={preloadedUpTo >= 1} />
        </View>
        <View key="3" style={styles.page}>
          <LivrePage isActive={currentPage === 2} preload={preloadedUpTo >= 2} />
        </View>
        <View key="4" style={styles.page}>
          <StatsPage isActive={currentPage === 3} preload={preloadedUpTo >= 3} />
        </View>
      </PagerView>
      
      <TabBar currentIndex={currentPage} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  settingsBtn: {
    marginRight: 8,
    padding: 4,
  },
  settingsIcon: {
    fontSize: 22,
  },
});