import { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getSetting } from '@/services/database';
import { useAuth } from '@/context/AuthContext';
import GeneratorPage from '@/components/pages/GeneratorPage';
import HistoriquePage from '@/components/pages/HistoriquePage';
import LivrePage from '@/components/pages/LivrePage';
import StatsPage from '@/components/pages/StatsPage';
import TabBar from '@/components/TabBar';

export default function MainScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { profile } = useAuth();
  const [recipeCount, setRecipeCount] = useState(3);
  const [preloadedUpTo, setPreloadedUpTo] = useState(-1);
  const [booksRefreshKey, setBooksRefreshKey] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPreloadedUpTo(1), 300);
    const t2 = setTimeout(() => setPreloadedUpTo(2), 600);
    const t3 = setTimeout(() => setPreloadedUpTo(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getSetting('recipe_count', '3').then(v => setRecipeCount(Number(v)));
      setBooksRefreshKey(k => k + 1);
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
                <View>
                  <Text style={styles.settingsIcon}>👨‍👩‍👧</Text>
                  {profile?.familyId && (
                    <View style={styles.familyCheck}>
                      <Text style={styles.familyCheckText}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/parametres')}
                style={styles.settingsBtn}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
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
          <LivrePage isActive={currentPage === 2} preload={preloadedUpTo >= 2} refreshKey={booksRefreshKey} />
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
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  familyCheck: {
    position: 'absolute',
    top: -5,
    right: -6,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  familyCheckText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 12,
  },
});