import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ScrollView, View, Text, Image, StyleSheet, TouchableOpacity, Alert, RefreshControl, Platform, Modal, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import Svg, { Circle } from 'react-native-svg';

function formatUnit(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

const GREETINGS = [
  { range: [0, 12], text: 'Good Morning', emoji: '\uD83C\uDF05' },
  { range: [12, 17], text: 'Good Afternoon', emoji: '\u2600\uFE0F' },
  { range: [17, 24], text: 'Good Evening', emoji: '\uD83C\uDF19' },
] as const;

function getGreeting(h: number) {
  for (const g of GREETINGS) {
    if (h >= g.range[0] && h < g.range[1]) return g;
  }
  return GREETINGS[0];
}

function ProgressRing({ size, progress, strokeWidth = 8, color, trackColor, children }: {
  size: number; progress: number; strokeWidth?: number; color: string; trackColor: string; children: React.ReactNode;
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

export default function DashboardScreen() {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const {
    tasks, steps, water, alarms, use24h, toggle24h, streak, settings,
    getActiveTasks, getCompletedTodayCount, theme, addTimerSession, adjustSteps, adjustWater,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Sound ref
  const soundRef = useRef<Audio.Sound | null>(null);

  const playCompletion = useCallback(async () => {
    if (settings.sound) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            soundRef.current = null;
          }
        });
      } catch { /* silent */ }
    }
    if (settings.vibration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate([0, 400, 200, 400]);
    }
  }, [settings.sound, settings.vibration]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  // Inline timer
  const [dashTimerMode, setDashTimerMode] = useState<'idle' | 'running' | 'paused'>('idle');
  const [dashTimerRemaining, setDashTimerRemaining] = useState(settings.focusDuration * 60);
  const dashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dashTimerStartRef = useRef(0);
  const dashTimerElapsedRef = useRef(0);
  const [showTimerComplete, setShowTimerComplete] = useState(false);
  const [completedSessionDuration, setCompletedSessionDuration] = useState(0);

  const startDashTimer = useCallback(() => {
    if (dashTimerRemaining <= 0) return;
    setDashTimerMode('running');
    dashTimerStartRef.current = Date.now();
    dashTimerElapsedRef.current = 0;
    if (dashTimerRef.current) clearInterval(dashTimerRef.current);
    dashTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - dashTimerStartRef.current) / 1000;
      const remaining = dashTimerElapsedRef.current + dashTimerRemaining - elapsed;
      if (remaining <= 0) {
        setDashTimerRemaining(0);
        setDashTimerMode('idle');
        if (dashTimerRef.current) clearInterval(dashTimerRef.current);
        playCompletion();
        addTimerSession(dashTimerRemaining);
        setCompletedSessionDuration(dashTimerRemaining);
        setShowTimerComplete(true);
        return;
      }
      setDashTimerRemaining(remaining);
    }, 200);
  }, [dashTimerRemaining, playCompletion, addTimerSession]);

  const pauseDashTimer = useCallback(() => {
    if (dashTimerRef.current) clearInterval(dashTimerRef.current);
    dashTimerElapsedRef.current += (Date.now() - dashTimerStartRef.current) / 1000;
    setDashTimerMode('paused');
    if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [settings.vibration]);

  const resetDashTimer = useCallback(() => {
    if (dashTimerRef.current) clearInterval(dashTimerRef.current);
    setDashTimerMode('idle');
    setDashTimerRemaining(settings.focusDuration * 60);
    dashTimerElapsedRef.current = 0;
    if (settings.vibration) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [settings.focusDuration, settings.vibration]);

  // keep remaining synced when settings change while idle
  useEffect(() => {
    if (dashTimerMode === 'idle') {
      setDashTimerRemaining(settings.focusDuration * 60);
    }
  }, [settings.focusDuration, dashTimerMode]);

  // cleanup timer on unmount
  useEffect(() => {
    return () => { if (dashTimerRef.current) clearInterval(dashTimerRef.current); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const timeStr = use24h
    ? `${formatUnit(h)}:${formatUnit(m)}`
    : `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${formatUnit(m)} ${h >= 12 ? 'PM' : 'AM'}`;
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase();
  const greeting = getGreeting(h);

  const activeTasks = getActiveTasks();
  const completedCount = getCompletedTodayCount();
  const stepsProgress = Math.min(steps / 10000, 1);
  const waterProgress = Math.min(water / 2.5, 1);
  const displayTasks = tasks.filter(t => !t.done).slice(0, 3);
  const focusProgress = tasks.length > 0 ? completedCount / tasks.length : 0;

  const glassCard = { backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder };

  const quickLinks = [
    { icon: 'access-time' as const, label: 'Clock', color: theme.primary, route: 'clock' },
    { icon: 'checklist' as const, label: 'Tasks', color: theme.secondary, route: 'tasks' },
    { icon: 'fitness-center' as const, label: 'Fitness', color: theme.tertiary, route: 'fitness' },
    { icon: 'settings' as const, label: 'Settings', color: theme.onSurfaceVariant, route: 'settings' },
  ];

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleQuickLink = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/${route}` as any);
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.avatarImg} />
          </View>
          <View>
            <Text style={styles.greeting}>{greeting.text}, {settings.profileName}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={toggle24h} accessibilityLabel="Toggle 12/24 hour format">
          <MaterialIcons name="access-time" size={22} color={theme.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Hero Clock */}
        <View style={[glassCard, styles.heroCard]}>
          <View>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.clockText}>{timeStr}</Text>
            <Text style={styles.greetingSub}>{greeting.emoji} {greeting.text}</Text>
          </View>
        </View>

        {/* Quick Module Links */}
        <View style={styles.quickLinks}>
          {quickLinks.map((link, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickLinkItem}
              onPress={() => handleQuickLink(link.route)}
              activeOpacity={0.6}
              accessibilityLabel={`Navigate to ${link.label}`}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: link.color + '33' }]}>
                <MaterialIcons name={link.icon} size={24} color={link.color} />
              </View>
              <Text style={styles.quickLinkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Focus + Alarm Grid */}
        <View style={styles.grid}>
          <View style={[glassCard, styles.focusCard]}>
            <ProgressRing
              size={140}
              progress={dashTimerMode === 'idle' ? focusProgress : (1 - dashTimerRemaining / (settings.focusDuration * 60))}
              color={theme.primary}
              trackColor={theme.chipBg}
            >
              <Text style={styles.timerText}>{formatUnit(dashTimerRemaining / 60)}:{formatUnit(dashTimerRemaining % 60)}</Text>
              <Text style={styles.timerLabel}>Pomo Session</Text>
            </ProgressRing>
            {dashTimerMode === 'idle' && (
              <TouchableOpacity style={styles.startBtn} onPress={startDashTimer} activeOpacity={0.7} accessibilityLabel="Start focus timer">
                <MaterialIcons name="play-arrow" size={20} color={theme.surface} />
                <Text style={styles.startBtnText}>Start Focus</Text>
              </TouchableOpacity>
            )}
            {dashTimerMode === 'running' && (
              <TouchableOpacity style={styles.startBtn} onPress={pauseDashTimer} activeOpacity={0.7} accessibilityLabel="Pause timer">
                <MaterialIcons name="pause" size={20} color={theme.surface} />
                <Text style={styles.startBtnText}>Pause</Text>
              </TouchableOpacity>
            )}
            {dashTimerMode === 'paused' && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.startBtn} onPress={startDashTimer} activeOpacity={0.7} accessibilityLabel="Resume timer">
                  <MaterialIcons name="play-arrow" size={20} color={theme.surface} />
                  <Text style={styles.startBtnText}>Resume</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: theme.tertiary }]} onPress={resetDashTimer} activeOpacity={0.7} accessibilityLabel="Reset timer">
                  <MaterialIcons name="refresh" size={20} color={theme.surface} />
                  <Text style={styles.startBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/clock' as any)}
              style={styles.focusDetailLink}
            >
              <Text style={styles.focusDetailText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[glassCard, styles.alarmCard]}
            onPress={() => router.push('/(tabs)/clock' as any)}
            activeOpacity={0.7}
            accessibilityLabel="View alarms"
          >
            <View style={styles.alarmHeader}>
              <Text style={styles.cardTitle}>Alarm</Text>
              <MaterialIcons name="add" size={24} color={theme.primary} />
            </View>
            {alarms.length > 0 ? (
              <View style={styles.alarmList}>
                {alarms.slice(0, 3).map(alarm => (
                  <View key={alarm.id} style={[styles.alarmRow, !alarm.active && { opacity: 0.4 }]}>
                    <View>
                      <Text style={styles.alarmLabel}>{alarm.label}</Text>
                      <Text style={styles.alarmTime}>
                        {formatUnit(alarm.hour)}:{formatUnit(alarm.minute)}
                        {!use24h && <Text style={styles.alarmAmPm}> {alarm.hour >= 12 ? 'PM' : 'AM'}</Text>}
                      </Text>
                    </View>
                    <View style={[styles.toggle, { backgroundColor: alarm.active ? theme.primary : theme.chipBg }]}>
                      <View style={[styles.toggleDot, { backgroundColor: alarm.active ? theme.surface : theme.onSurfaceVariant }]} />
                    </View>
                  </View>
                ))}
                {alarms.length > 3 && (
                  <Text style={styles.moreAlarms}>+{alarms.length - 3} more</Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyAlarm}>
                <MaterialIcons name="alarm-off" size={28} color={theme.onSurfaceVariant} />
                <Text style={styles.emptyText}>No alarms set</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Today's Tasks */}
        <View style={[glassCard, styles.tasksCard]}>
          <View style={styles.tasksHeader}>
            <Text style={styles.cardTitle}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks' as any)} accessibilityLabel="View all tasks">
              <Text style={styles.remainingBadge}>{activeTasks.length} Remaining {'\u2192'}</Text>
            </TouchableOpacity>
          </View>
          {displayTasks.length === 0 ? (
            <View style={styles.emptyTasksWrap}>
              <MaterialIcons name="check-circle" size={40} color={theme.secondary} />
              <Text style={styles.emptyTasks}>All tasks completed!</Text>
            </View>
          ) : displayTasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskItem} activeOpacity={0.7}>
              <View style={[styles.checkbox, { borderColor: theme.outlineVariant }, task.done && { backgroundColor: theme.secondary, borderColor: theme.secondary }]} />
              <View style={styles.taskInfo}>
                <Text style={[styles.taskTitle, task.done && { textDecorationLine: 'line-through', opacity: 0.6, color: theme.onSurfaceVariant }]}>
                  {task.title}
                </Text>
                <Text style={styles.taskMeta}>
                  {task.category || 'General'}
                  {task.priority === 'high' ? ' \u2022 High Priority' : ''}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Summary */}
        <View style={[glassCard, styles.fitnessSummary]}>
          <Text style={styles.cardTitle}>Fitness Summary</Text>
          <View style={styles.fitnessGrid}>
            <TouchableOpacity
              style={styles.stepsCard}
              onPress={() => router.push('/(tabs)/fitness' as any)}
              activeOpacity={0.7}
              accessibilityLabel="View steps"
            >
              <View style={styles.fitnessCardHeader}>
                <View style={[styles.fitnessIcon, { backgroundColor: theme.secondary + '33' }]}>
                  <MaterialIcons name="directions-walk" size={20} color={theme.secondary} />
                </View>
                <Text style={styles.fitnessPercent}>{Math.round(stepsProgress * 100)}%</Text>
              </View>
              <Text style={styles.fitnessValue}>{steps.toLocaleString()}</Text>
              <Text style={styles.fitnessLabel}>Steps Today / 10k goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.waterCard}
              onPress={() => router.push('/(tabs)/fitness' as any)}
              activeOpacity={0.7}
              accessibilityLabel="View hydration"
            >
              <View style={styles.fitnessCardHeader}>
                <View style={[styles.fitnessIcon, { backgroundColor: theme.primary + '33' }]}>
                  <MaterialIcons name="water-drop" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.fitnessPercent, { color: theme.primary }]}>{water.toFixed(1)}L / 2.5L</Text>
              </View>
              <View style={styles.waterDots}>
                {[0, 1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.waterDot,
                      { backgroundColor: i / 5 < waterProgress ? theme.primary : theme.primary + '33' },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.fitnessLabel}>Hydration Tracker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick controls for steps & water on Dashboard */}
        <View style={[glassCard, styles.quickActions]}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => adjustSteps(500)} activeOpacity={0.7} accessibilityLabel="Add 500 steps">
              <MaterialIcons name="directions-walk" size={22} color={theme.secondary} />
              <Text style={styles.quickActionText}>+500 Steps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => adjustWater(0.25)} activeOpacity={0.7} accessibilityLabel="Add 250ml water">
              <MaterialIcons name="water-drop" size={22} color={theme.primary} />
              <Text style={styles.quickActionText}>+250ml Water</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => adjustWater(0.5)} activeOpacity={0.7} accessibilityLabel="Add 500ml water">
              <MaterialIcons name="opacity" size={22} color={theme.tertiary} />
              <Text style={styles.quickActionText}>+500ml Water</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mindfulness Card */}
        <View style={[glassCard, styles.mindfulnessCard]}>
          <LinearGradient
            colors={[theme.primary + '22', theme.background]}
            style={styles.mindfulnessOverlay}
          >
            <View style={[styles.mindfulnessTag, { backgroundColor: theme.primary + '33', borderColor: theme.primary + '55' }]}>
              <Text style={styles.mindfulnessTagText}>Mindfulness</Text>
            </View>
            <Text style={styles.mindfulnessTitle}>Mid-day Meditation</Text>
            <Text style={styles.mindfulnessDesc}>
              Recommended: 5-minute breathing session
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Timer Complete Modal */}
      <Modal visible={showTimerComplete} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[glassCard, styles.modalContent]}>
            <ProgressRing size={100} progress={1} color={theme.primary} trackColor={theme.chipBg}>
              <MaterialIcons name="check" size={40} color={theme.primary} />
            </ProgressRing>
            <Text style={styles.modalTitle}>Focus Complete!</Text>
            <Text style={styles.modalSub}>Great session! Take a break.</Text>
            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {completedSessionDuration >= 3600
                    ? `${Math.floor(completedSessionDuration / 3600)}h ${formatUnit((completedSessionDuration % 3600) / 60)}m`
                    : `${Math.floor(completedSessionDuration / 60)}m ${formatUnit(completedSessionDuration % 60)}s`}
                </Text>
                <Text style={styles.modalStatLabel}>Duration</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>+{streak}</Text>
                <Text style={styles.modalStatLabel}>Day Streak</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowTimerComplete(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1, borderBottomColor: theme.tabBarBorder,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
      backgroundColor: theme.primaryContainer,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: theme.chipBorder,
    },
    avatarImg: { width: 40, height: 40, borderRadius: 20 },
    greeting: { fontSize: 17, fontWeight: '700', color: theme.primary },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 20, paddingBottom: 100 },
    heroCard: {
      padding: 20, borderRadius: 16,
    },
    dateText: {
      fontSize: 12, fontWeight: '500', color: theme.primary,
      letterSpacing: 1, marginBottom: 4,
    },
    clockText: {
      fontSize: 42, fontWeight: '700', color: theme.onSurface, letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    greetingSub: {
      fontSize: 14, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 4,
    },
    quickLinks: {
      flexDirection: 'row', justifyContent: 'space-between', gap: 12,
    },
    quickLinkItem: { flex: 1, alignItems: 'center', gap: 8 },
    quickLinkIcon: {
      width: 52, height: 52, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    quickLinkLabel: { fontSize: 11, fontWeight: '600', color: theme.onSurfaceVariant, letterSpacing: 0.3 },
    grid: { flexDirection: 'row', gap: 16 },
    focusCard: {
      flex: 1, padding: 16, borderRadius: 16,
      alignItems: 'center', gap: 12, minHeight: 260,
    },
    timerText: { fontSize: 26, fontWeight: '700', color: theme.onSurface, fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 11, fontWeight: '600', color: theme.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    startBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 20,
      borderRadius: 12, flex: 1,
    },
    startBtnText: { fontSize: 14, fontWeight: '700', color: theme.surface },
    btnRow: { flexDirection: 'row', gap: 8, width: '100%' },
    focusDetailLink: { marginTop: 4 },
    focusDetailText: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant, textDecorationLine: 'underline' },
    alarmCard: { flex: 1, padding: 16, borderRadius: 16, justifyContent: 'space-between' },
    alarmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.onSurface, marginBottom: 12, letterSpacing: 0.3 },
    alarmRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: theme.chipBg, padding: 12, borderRadius: 12,
      borderWidth: 1, borderColor: theme.borderColor,
    },
    alarmLabel: {
      fontSize: 11, fontWeight: '600', color: theme.onSurfaceVariant,
      letterSpacing: 1, textTransform: 'uppercase' as const,
    },
    alarmTime: { fontSize: 22, fontWeight: '700', color: theme.onSurface, fontVariant: ['tabular-nums'] },
    alarmAmPm: { fontSize: 14, fontWeight: '500' },
    toggle: {
      width: 48, height: 24, borderRadius: 12,
      justifyContent: 'center', paddingHorizontal: 3, alignItems: 'flex-end',
    },
    toggleDot: { width: 18, height: 18, borderRadius: 9 },
    emptyAlarm: { alignItems: 'center', gap: 8, paddingVertical: 12 },
    alarmList: { gap: 8 },
    moreAlarms: { fontSize: 12, fontWeight: '600', color: theme.primary, textAlign: 'center', marginTop: 4 },
    tasksCard: { padding: 16, borderRadius: 16 },
    tasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    remainingBadge: { fontSize: 13, fontWeight: '600', color: theme.primary },
    taskItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
      backgroundColor: theme.chipBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.borderColor, marginBottom: 8,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2,
    },
    taskInfo: { flex: 1 },
    taskTitle: { fontSize: 15, fontWeight: '500', color: theme.onSurface },
    taskMeta: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 2 },
    emptyTasksWrap: { alignItems: 'center', gap: 8, paddingVertical: 20 },
    emptyTasks: { fontSize: 15, fontWeight: '500', color: theme.onSurfaceVariant },
    fitnessSummary: { padding: 16, borderRadius: 16 },
    fitnessGrid: { flexDirection: 'row', gap: 12 },
    stepsCard: {
      flex: 1, padding: 12, borderRadius: 12,
      backgroundColor: theme.chipBg,
      borderWidth: 1, borderColor: theme.borderColor,
      justifyContent: 'space-between', height: 120,
    },
    waterCard: {
      flex: 1, padding: 12, borderRadius: 12,
      backgroundColor: theme.chipBg,
      borderWidth: 1, borderColor: theme.borderColor,
      justifyContent: 'space-between', height: 120,
    },
    fitnessCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    fitnessIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    fitnessPercent: { fontSize: 12, fontWeight: '700', color: theme.secondary },
    fitnessValue: { fontSize: 24, fontWeight: '700', color: theme.onSurface, fontVariant: ['tabular-nums'] },
    fitnessLabel: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant },
    waterDots: { flexDirection: 'row', gap: 4 },
    waterDot: { flex: 1, height: 8, borderRadius: 4 },
    quickActions: { padding: 16, borderRadius: 16 },
    quickActionsRow: { flexDirection: 'row', gap: 8 },
    quickActionBtn: {
      flex: 1, alignItems: 'center', gap: 6,
      padding: 12, borderRadius: 12,
      backgroundColor: theme.chipBg,
      borderWidth: 1, borderColor: theme.borderColor,
    },
    quickActionText: { fontSize: 11, fontWeight: '600', color: theme.onSurfaceVariant },
    emptyText: { fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center' },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    },
    modalContent: {
      width: '100%', padding: 32, borderRadius: 24,
      alignItems: 'center', gap: 16,
    },
    modalTitle: { fontSize: 24, fontWeight: '700', color: theme.onSurface },
    modalSub: { fontSize: 15, fontWeight: '500', color: theme.onSurfaceVariant },
    modalStats: {
      flexDirection: 'row', alignItems: 'center', gap: 24,
      paddingVertical: 12, paddingHorizontal: 20,
      backgroundColor: theme.chipBg, borderRadius: 16,
      borderWidth: 1, borderColor: theme.borderColor,
    },
    modalStatItem: { alignItems: 'center', gap: 4 },
    modalStatValue: { fontSize: 18, fontWeight: '700', color: theme.primary },
    modalStatLabel: { fontSize: 11, fontWeight: '600', color: theme.onSurfaceVariant, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    modalDivider: { width: 1, height: 32, backgroundColor: theme.borderColor },
    modalBtn: {
      width: '100%', alignItems: 'center', paddingVertical: 14,
      backgroundColor: theme.primary, borderRadius: 14,
    },
    modalBtnText: { fontSize: 16, fontWeight: '700', color: theme.surface },
    mindfulnessCard: { borderRadius: 16, height: 200, overflow: 'hidden' },
    mindfulnessOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20 },
    mindfulnessTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
    },
    mindfulnessTagText: { fontSize: 11, fontWeight: '600', color: theme.primary, letterSpacing: 0.5 },
    mindfulnessTitle: { fontSize: 20, fontWeight: '700', color: theme.onSurface, letterSpacing: 0.3 },
    mindfulnessDesc: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 4 },
  });
}
