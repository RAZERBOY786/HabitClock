import { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { Theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

function getGreeting(h: number) {
  if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

function ProgressRing({ size, progress, strokeWidth = 10, color, trackColor = 'rgba(255,255,255,0.05)', children }: {
  size: number; progress: number; strokeWidth?: number; color: string; trackColor?: string; children: React.ReactNode;
}) {
  const half = size / 2;
  const radius = half - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress || 0));
  const strokeDashoffset = circumference * (1 - clamped);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={half} cy={half} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={half} cy={half} r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${half} ${half})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export default function FitnessScreen() {
  const [now, setNow] = useState(new Date());
  const { theme, steps, water, adjustSteps, adjustWater, resetFitness, getFitnessHistory, settings } = useApp();
  const targetSteps = 10000;
  const targetWater = 2.5;
  const stepsProgress = Math.min(steps / targetSteps, 1);
  const waterProgress = Math.min(water / targetWater, 1);
  const greeting = getGreeting(now.getHours());

  const glassCard = { backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder, };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // 7-day fitness data
  const fitnessHistory = useMemo(() => getFitnessHistory(), [getFitnessHistory]);
  const last7 = useMemo(() => {
    const days: { date: string; steps: number; water: number; label: string; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const label = i === 0 ? 'Today' : dayNames[d.getDay()];
      const entry = fitnessHistory.find(f => f.date === key);
      const isToday = i === 0;
      days.push({
        date: key, label,
        steps: isToday ? steps : (entry?.steps ?? 0),
        water: isToday ? water : (entry?.water ?? 0),
        isToday,
      });
    }
    return days;
  }, [fitnessHistory, steps, water]);

  const maxSteps = Math.max(...last7.map(d => d.steps), 1);
  const avgSteps = Math.round(last7.reduce((s, d) => s + d.steps, 0) / 7);
  const avgWater = +(last7.reduce((s, d) => s + d.water, 0) / 7).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.avatarImg} />
          </View>
          <Text style={styles.greeting}>{greeting.text}, {settings.profileName}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Reset Daily Data', 'Reset steps and water to zero?', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'Reset', style: 'destructive', onPress: resetFitness },
])}>
          <MaterialIcons name="refresh" size={22} color={theme.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[glassCard, styles.stepsHero]}>
          <ProgressRing size={180} progress={stepsProgress} color={theme.secondary} trackColor={theme.chipBg}>
            <Text style={styles.stepsCount}>{steps.toLocaleString()}</Text>
            <Text style={styles.stepsLabel}>Steps</Text>
          </ProgressRing>
          <View style={styles.targetRow}>
            <Text style={styles.targetText}>Target: 10,000 steps</Text>
            <Text style={styles.remainingText}>
              {steps >= targetSteps ? 'Goal reached!' : `${(targetSteps - steps).toLocaleString()} steps to go`}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stepsProgress * 100}%`, backgroundColor: theme.secondary }]} />
          </View>
          <View style={styles.stepsControls}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustSteps(-500)}>
              <MaterialIcons name="remove" size={20} color={theme.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.stepBtn, { backgroundColor: 'rgba(78, 222, 163, 0.3)' }]} onPress={() => adjustSteps(500)}>
              <MaterialIcons name="add" size={20} color={theme.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[glassCard, styles.waterCard]}>
            <View style={styles.waterHeader}>
              <View>
                <Text style={styles.statLabel}>Hydration</Text>
                <View style={styles.waterValueRow}>
                  <Text style={styles.waterValue}>{water.toFixed(1)}</Text>
                  <Text style={styles.waterUnit}>L</Text>
                </View>
              </View>
              <MaterialIcons name="water-drop" size={24} color={theme.primary} />
            </View>

            <View style={styles.waveContainer}>
              <View
                style={[
                  styles.wave,
                  { transform: [{ translateY: (1 - waterProgress) * 80 + 20 }] },
                ]}
              />
            </View>

            <View style={styles.quickWaterRow}>
              <TouchableOpacity style={styles.quickWaterBtn} onPress={() => adjustWater(0.25)}>
                <Text style={styles.quickWaterText}>+250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickWaterBtn} onPress={() => adjustWater(0.5)}>
                <Text style={styles.quickWaterText}>+500ml</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.waterControls}>
              <TouchableOpacity style={styles.waterBtn} onPress={() => adjustWater(-0.2)}>
                <MaterialIcons name="remove" size={18} color={theme.onSurface} />
              </TouchableOpacity>
              <Text style={styles.waterGoal}>Goal: 2.5L</Text>
              <TouchableOpacity style={[styles.waterBtn, styles.waterAddBtn]} onPress={() => adjustWater(0.2)}>
                <MaterialIcons name="add" size={18} color={theme.surface} />
              </TouchableOpacity>
            </View>
            <View style={[styles.progressBarBg, { marginTop: 8 }]}>
              <View style={[styles.progressBarFill, { width: `${waterProgress * 100}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          <View style={[glassCard, styles.stepsChartCard]}>
            <View style={styles.chartHeader}>
              <Text style={styles.statLabel}>Steps (7 Days)</Text>
              <Text style={styles.chartAvg}>{avgSteps.toLocaleString()} avg</Text>
            </View>
            <View style={styles.chartContainer}>
              <View style={styles.chart}>
                {last7.map((d, i) => (
                  <View key={d.date} style={styles.chartCol}>
                    <Text style={styles.chartBarValue}>{d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps}</Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(4, (d.steps / maxSteps) * 80),
                          backgroundColor: d.isToday ? theme.tertiary : theme.primary + '66',
                        },
                        d.isToday && styles.barActive,
                      ]}
                    />
                    <Text style={[styles.chartBarLabel, d.isToday && styles.chartBarLabelActive]}>{d.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[glassCard, styles.weeklyCard]}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>Weekly Avg</Text>
            <MaterialIcons name="trending-up" size={20} color={theme.onSurfaceVariant} />
          </View>
          <View style={styles.weeklyItems}>
            <View style={styles.weeklyItem}>
              <View style={styles.weeklyItemLeft}>
                <View style={[styles.weeklyIcon, { backgroundColor: theme.secondary + '22' }]}>
                  <MaterialIcons name="directions-walk" size={20} color={theme.secondary} />
                </View>
                <View>
                  <Text style={styles.weeklyItemTitle}>Steps</Text>
                  <Text style={styles.weeklyItemSub}>{avgSteps.toLocaleString()} avg / day</Text>
                </View>
              </View>
              <View style={styles.weeklyBarBg}>
                <View style={[styles.weeklyBarFill, { width: `${Math.min(100, (avgSteps / targetSteps) * 100)}%`, backgroundColor: theme.secondary }]} />
              </View>
            </View>
            <View style={styles.weeklyItem}>
              <View style={styles.weeklyItemLeft}>
                <View style={[styles.weeklyIcon, { backgroundColor: theme.primary + '22' }]}>
                  <MaterialIcons name="water-drop" size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={styles.weeklyItemTitle}>Water</Text>
                  <Text style={styles.weeklyItemSub}>{avgWater}L avg / day</Text>
                </View>
              </View>
              <View style={styles.weeklyBarBg}>
                <View style={[styles.weeklyBarFill, { width: `${Math.min(100, (avgWater / targetWater) * 100)}%`, backgroundColor: theme.primary }]} />
              </View>
            </View>
            <View style={styles.weeklyItem}>
              <View style={styles.weeklyItemLeft}>
                <View style={[styles.weeklyIcon, { backgroundColor: theme.tertiary + '22' }]}>
                  <MaterialIcons name="local-fire-department" size={20} color={theme.tertiary} />
                </View>
                <View>
                  <Text style={styles.weeklyItemTitle}>Best Day</Text>
                  <Text style={styles.weeklyItemSub}>{last7.reduce((best, d) => d.steps > (best?.steps ?? 0) ? d : best, last7[0])?.label} — {(Math.max(...last7.map(d => d.steps)) / 1000).toFixed(1)}k steps</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <MaterialIcons name="lightbulb" size={28} color={theme.secondary} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro Tip</Text>
            <Text style={styles.tipText}>
              Walking for just 10 minutes after a meal can significantly improve digestion and blood sugar levels.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 8,
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1, borderBottomColor: theme.tabBarBorder,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
      backgroundColor: 'rgba(173, 198, 255, 0.2)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(173, 198, 255, 0.3)',
    },
    avatarImg: { width: 40, height: 40, borderRadius: 20 },
    greeting: { fontSize: 18, fontWeight: '700', color: theme.primary },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16, paddingBottom: 100 },
    stepsHero: {
      padding: 20, borderRadius: 20, alignItems: 'center', position: 'relative',
    },
    stepsControls: { flexDirection: 'row', gap: 12, marginTop: 16 },
    stepBtn: {
      backgroundColor: 'rgba(78, 222, 163, 0.2)', padding: 8, borderRadius: 8,
    },
    stepsCount: { fontSize: 34, fontWeight: '700', color: theme.onSurface },
    stepsLabel: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant },
    targetRow: { alignItems: 'center', marginTop: 12, gap: 4 },
    targetText: { fontSize: 13, fontWeight: '500', color: theme.secondary, letterSpacing: 1, textTransform: 'uppercase' },
    remainingText: { fontSize: 15, color: theme.onSurfaceVariant },
    progressBarBg: {
      width: '100%', height: 6, backgroundColor: theme.chipBg,
      borderRadius: 3, overflow: 'hidden', marginTop: 12,
    },
    progressBarFill: { height: '100%', borderRadius: 3 },
    statsGrid: { flexDirection: 'row', gap: 16 },
    waterCard: { flex: 1, padding: 16, borderRadius: 20, overflow: 'hidden' },
    waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statLabel: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant },
    waterValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    waterValue: { fontSize: 22, fontWeight: '600', color: theme.primary },
    waterUnit: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
    waveContainer: {
      height: 80, backgroundColor: 'rgba(0, 165, 114, 0.1)',
      borderRadius: 12, overflow: 'hidden', marginVertical: 8, position: 'relative',
    },
    wave: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 80, backgroundColor: theme.secondary, opacity: 0.4, borderRadius: 20,
    },
    quickWaterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    quickWaterBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 10,
      backgroundColor: 'rgba(173,198,255,0.15)', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(173,198,255,0.3)',
    },
    quickWaterText: { fontSize: 13, fontWeight: '600', color: theme.primary },
    waterControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    waterBtn: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: theme.surfaceHigh, alignItems: 'center', justifyContent: 'center',
    },
    waterAddBtn: { backgroundColor: theme.primaryContainer },
    waterGoal: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
    stepsChartCard: { flex: 1, padding: 16, borderRadius: 20 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chartAvg: { fontSize: 12, fontWeight: '600', color: theme.tertiary },
    chartContainer: { justifyContent: 'center', marginVertical: 8 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, height: 110 },
    chartCol: { flex: 1, alignItems: 'center', gap: 4 },
    chartBarValue: { fontSize: 9, fontWeight: '600', color: theme.onSurfaceVariant },
    bar: { width: '70%', borderRadius: 4, minHeight: 4 },
    barActive: {
      shadowColor: theme.tertiary, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    },
    chartBarLabel: { fontSize: 10, fontWeight: '500', color: theme.onSurfaceVariant },
    chartBarLabelActive: { color: theme.tertiary, fontWeight: '700' },
    weeklyCard: { padding: 16, borderRadius: 20 },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    weeklyTitle: { fontSize: 20, fontWeight: '600', color: theme.onSurface },
    weeklyItems: { gap: 12 },
    weeklyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    weeklyItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    weeklyIcon: { padding: 8, borderRadius: 12 },
    weeklyItemTitle: { fontSize: 14, fontWeight: '500', color: theme.onSurface },
    weeklyItemSub: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
    weeklyBarBg: {
      width: 96, height: 6, backgroundColor: theme.chipBg,
      borderRadius: 3, overflow: 'hidden',
    },
    weeklyBarFill: { height: '100%', borderRadius: 3 },
    tipCard: {
      flexDirection: 'row', gap: 16, padding: 16,
      backgroundColor: 'rgba(78, 222, 163, 0.1)',
      borderRadius: 20, borderWidth: 1, borderColor: 'rgba(78, 222, 163, 0.2)',
    },
    tipContent: { flex: 1 },
    tipTitle: { fontSize: 14, fontWeight: '500', color: theme.secondary },
    tipText: { fontSize: 14, color: theme.onSurface, marginTop: 4, lineHeight: 20 },
  });
}
