import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ScrollView, View, Text, TextInput, Image, StyleSheet,
  TouchableOpacity, Alert, FlatList, Modal, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { useLocalSearchParams } from 'expo-router';
import { Theme } from '@/constants/theme';
import { useApp, RoutineItem, Alarm } from '@/context/AppContext';
import { getAllSounds, getAlarmSound, AlarmSound } from '@/constants/sounds';

function formatUnit(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function getGreeting(h: number) {
  if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

type TimerMode = 'idle' | 'running' | 'paused';
type SwMode = 'idle' | 'running' | 'paused';

async function playCompletionSound(volume = 0.8) {
  try {
    const s = getAlarmSound('classic');
    const { sound } = await Audio.Sound.createAsync(s.source, { shouldPlay: true, volume });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch {}
}

export default function ClockScreen() {
  const {
    use24h, toggle24h, alarms, addAlarm, toggleAlarm, deleteAlarm, updateAlarm,
    routine, addRoutineItem, removeRoutineItem, toggleRoutineItem,
    timerHistory, addTimerSession, bestLap, setBestLap,
    settings: { vibration, sound },
    theme,
  } = useApp();

  const glassCard = { backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder, };

  const [now, setNow] = useState(new Date());

  // Timer
  const [timerMode, setTimerMode] = useState<TimerMode>('idle');
  const [timerRemaining, setTimerRemaining] = useState(25 * 60);
  const [timerInput, setTimerInput] = useState('25:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef(0);
  const timerElapsedRef = useRef(0);

  // Stopwatch
  const [swMode, setSwMode] = useState<SwMode>('idle');
  const [swElapsed, setSwElapsed] = useState(0);
  const [laps, setLaps] = useState<{ id: string; time: number; lap: number }[]>([]);
  const swRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swStartRef = useRef(0);
  const swElapsedRef = useRef(0);
  const lapCountRef = useRef(0);
  const lastLapRef = useRef(0);

  // Alarm modal
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);
  const [newAlarmH, setNewAlarmH] = useState(8);
  const [newAlarmM, setNewAlarmM] = useState(0);
  const [newAlarmLabel, setNewAlarmLabel] = useState('');
  const [newAlarmRepeat, setNewAlarmRepeat] = useState<'daily' | 'weekdays' | 'none'>('daily');
  const [newAlarmSound, setNewAlarmSound] = useState('classic');
  const [newAlarmVolume, setNewAlarmVolume] = useState(0.8);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);

  // Routine modal
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [newRoutineTime, setNewRoutineTime] = useState('12:00');
  const [newRoutineLabel, setNewRoutineLabel] = useState('');
  const [newRoutineIcon, setNewRoutineIcon] = useState('timer');

  // Timer history modal
  const [showHistory, setShowHistory] = useState(false);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (swRef.current) clearInterval(swRef.current);
    };
  }, []);

  // Auto-start focus from Dashboard
  const { startFocus } = useLocalSearchParams<{ startFocus?: string }>();
  const focusStarted = useRef(false);
  useEffect(() => {
    if (startFocus && !focusStarted.current) {
      focusStarted.current = true;
      const minutes = Math.max(1, parseInt(startFocus, 10) || 25);
      const totalSec = minutes * 60;
      setTimerInput(`${minutes}:00`);
      setTimerRemaining(totalSec);
      // use a ref to bypass stale closure
      const durRef = totalSec;
      timerStartRef.current = Date.now();
      timerElapsedRef.current = 0;
      setTimerMode('running');
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - timerStartRef.current) / 1000;
        const remaining = timerElapsedRef.current + durRef - elapsed;
        if (remaining <= 0) {
          setTimerRemaining(0);
          setTimerMode('idle');
          if (timerRef.current) clearInterval(timerRef.current);
          if (vibration) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Vibration.vibrate([0, 400, 200, 400]);
          }
          if (sound) playCompletionSound();
          Alert.alert('⏰ Timer Done', 'Your countdown has finished!');
          addTimerSession(durRef);
          return;
        }
        setTimerRemaining(remaining);
      }, 100);
    }
  }, [startFocus]);

  // === TIMER ===
  const startTimer = useCallback(() => {
    if (timerRemaining <= 0) return;
    setTimerMode('running');
    timerStartRef.current = Date.now();
    timerElapsedRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const remaining = timerElapsedRef.current + timerRemaining - elapsed;
      if (remaining <= 0) {
        setTimerRemaining(0);
        setTimerMode('idle');
        if (timerRef.current) clearInterval(timerRef.current);
        if (vibration) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Vibration.vibrate([0, 400, 200, 400]);
        }
        if (sound) playCompletionSound();
        Alert.alert('⏰ Timer Done', 'Your countdown has finished!');
        addTimerSession(timerRemaining);
        return;
      }
      setTimerRemaining(remaining);
    }, 100);
  }, [timerRemaining, vibration, sound, addTimerSession]);

  const pauseTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerElapsedRef.current += (Date.now() - timerStartRef.current) / 1000;
    setTimerMode('paused');
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerMode('idle');
    const parts = timerInput.split(':');
    const mins = parseInt(parts[0]) || 25;
    const secs = parseInt(parts[1]) || 0;
    setTimerRemaining(mins * 60 + secs);
  };

  const parseTimerInput = (text: string) => {
    setTimerInput(text);
    const cleaned = text.replace(/[^0-9:]/g, '');
    const parts = cleaned.split(':');
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    setTimerRemaining(mins * 60 + secs);
  };

  const applyPreset = (mins: number) => {
    setTimerInput(`${formatUnit(mins)}:00`);
    setTimerRemaining(mins * 60);
  };

  // === STOPWATCH ===
  const startStopwatch = () => {
    setSwMode('running');
    swStartRef.current = Date.now();
    if (swRef.current) clearInterval(swRef.current);
    swRef.current = setInterval(() => {
      const elapsed = swElapsedRef.current + (Date.now() - swStartRef.current) / 1000;
      setSwElapsed(elapsed);
    }, 50);
  };

  const pauseStopwatch = () => {
    if (swRef.current) clearInterval(swRef.current);
    swElapsedRef.current += (Date.now() - swStartRef.current) / 1000;
    setSwMode('paused');
  };

  const resetStopwatch = () => {
    if (swRef.current) clearInterval(swRef.current);
    setSwMode('idle'); setSwElapsed(0); setLaps([]);
    swElapsedRef.current = 0; lapCountRef.current = 0; lastLapRef.current = 0;
  };

  const addLap = () => {
    const lapTime = swElapsed - lastLapRef.current;
    lastLapRef.current = swElapsed;
    lapCountRef.current += 1;
    setLaps(prev => [{ id: Date.now().toString(), time: lapTime, lap: lapCountRef.current }, ...prev]);
    if (bestLap === null || lapTime < bestLap) setBestLap(lapTime);
  };

  const allSounds = useMemo(() => getAllSounds(), []);

  // Preview alarm sound
  const playPreview = useCallback(async (soundId: string) => {
    try {
      if (previewSound) { await previewSound.unloadAsync(); setPreviewSound(null); }
      const s = getAlarmSound(soundId);
      const { sound } = await Audio.Sound.createAsync(s.source, { shouldPlay: true, volume: 0.5 });
      setPreviewSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) { sound.unloadAsync(); setPreviewSound(null); }
      });
    } catch { /* silent */ }
  }, [previewSound]);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => { previewSound?.unloadAsync(); };
  }, [previewSound]);

  // === ALARM ===
  const handleAddAlarm = () => {
    if (editingAlarmId) {
      updateAlarm(editingAlarmId, {
        hour: newAlarmH, minute: newAlarmM,
        label: newAlarmLabel || `Alarm`,
        repeat: newAlarmRepeat, sound: newAlarmSound, volume: newAlarmVolume,
      });
    } else {
      addAlarm({
        hour: newAlarmH, minute: newAlarmM,
        label: newAlarmLabel || `Alarm ${alarms.length + 1}`,
        active: true, repeat: newAlarmRepeat,
        sound: newAlarmSound, volume: newAlarmVolume,
      });
    }
    setShowAlarmModal(false);
    setEditingAlarmId(null);
    setNewAlarmLabel('');
    previewSound?.unloadAsync();
  };

  const openNewAlarm = () => {
    setEditingAlarmId(null);
    setNewAlarmH(8); setNewAlarmM(0); setNewAlarmLabel('');
    setNewAlarmRepeat('daily'); setNewAlarmSound('classic'); setNewAlarmVolume(0.8);
    setShowAlarmModal(true);
  };

  const openEditAlarm = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id);
    setNewAlarmH(alarm.hour); setNewAlarmM(alarm.minute);
    setNewAlarmLabel(alarm.label);
    setNewAlarmRepeat(alarm.repeat || 'daily');
    setNewAlarmSound(alarm.sound || 'classic');
    setNewAlarmVolume(alarm.volume ?? 0.8);
    setShowAlarmModal(true);
  };

  // === ROUTINE ===
  const handleAddRoutine = () => {
    if (!newRoutineLabel.trim()) return;
    addRoutineItem({ time: newRoutineTime, label: newRoutineLabel, icon: newRoutineIcon, done: false });
    setShowRoutineModal(false);
    setNewRoutineLabel('');
  };

  const h = now.getHours();
  const m = now.getMinutes();
  const timeStr = use24h
    ? `${formatUnit(h)}:${formatUnit(m)}`
    : `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${formatUnit(m)} ${h >= 12 ? 'PM' : 'AM'}`;
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const greeting = getGreeting(h);

  const timerMins = formatUnit(timerRemaining / 60);
  const timerSecs = formatUnit(timerRemaining % 60);
  const swMins = formatUnit(swElapsed / 60);
  const swSecs = formatUnit(swElapsed % 60);
  const swCents = formatUnit((swElapsed * 100) % 100);

  const currentTimeMinutes = h * 60 + m;
  const nextRoutine = routine.find(r => {
    const [rh, rm] = r.time.split(':').map(Number);
    return rh * 60 + rm > currentTimeMinutes && !r.done;
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.avatarImg} />
          </View>
          <Text style={styles.greeting}>{greeting.text}, Alex</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowHistory(true)}>
            <MaterialIcons name="history" size={22} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={toggle24h}>
            <MaterialIcons name="access-time" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Live Clock */}
        <View style={[glassCard, styles.clockCard]}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.clockText}>{timeStr}</Text>
          <Text style={styles.formatHint}>{use24h ? '24h' : '12h'} format</Text>
        </View>

        {/* Timer */}
        <View style={[glassCard, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="timer" size={22} color={theme.secondary} />
            <Text style={styles.sectionTitle}>Timer</Text>
          </View>
          {timerMode === 'idle' ? (
            <View>
              <View style={styles.timerInputRow}>
                <TextInput
                  style={styles.timerInput}
                  value={timerInput}
                  onChangeText={parseTimerInput}
                  keyboardType="numbers-and-punctuation"
                  placeholderTextColor={theme.onSurfaceVariant}
                />
              </View>
              <View style={styles.presetRow}>
                {[5, 10, 15, 25, 30, 45].map(m => (
                  <TouchableOpacity key={m} style={styles.presetBtn} onPress={() => applyPreset(m)}>
                    <Text style={styles.presetText}>{m}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={startTimer}>
                <MaterialIcons name="play-arrow" size={20} color="#002e6a" />
                <Text style={styles.primaryBtnText}>Start Timer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.timerDisplay}>{timerMins}:{timerSecs}</Text>
              <View style={styles.timerControls}>
                {timerMode === 'running' ? (
                  <TouchableOpacity style={styles.secondaryBtn} onPress={pauseTimer}>
                    <MaterialIcons name="pause" size={20} color={theme.onSurface} />
                    <Text style={styles.secondaryBtnText}>Pause</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.primaryBtn} onPress={startTimer}>
                    <MaterialIcons name="play-arrow" size={20} color="#002e6a" />
                    <Text style={styles.primaryBtnText}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dangerBtn} onPress={resetTimer}>
                  <MaterialIcons name="stop" size={20} color={theme.error} />
                  <Text style={styles.dangerBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Stopwatch */}
        <View style={[glassCard, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="hourglass-bottom" size={22} color={theme.tertiary} />
            <Text style={styles.sectionTitle}>Stopwatch</Text>
            {bestLap !== null && (
              <Text style={styles.bestLapText}>Best: {formatUnit(bestLap / 60)}:{formatUnit(bestLap % 60)}.{formatUnit((bestLap * 100) % 100)}</Text>
            )}
          </View>
          <Text style={styles.swDisplay}>{swMins}:{swSecs}.{swCents}</Text>
          <View style={styles.swControls}>
            {swMode === 'idle' ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={startStopwatch}>
                <MaterialIcons name="play-arrow" size={20} color="#002e6a" />
                <Text style={styles.primaryBtnText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <>
                {swMode === 'running' ? (
                  <>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={pauseStopwatch}>
                      <MaterialIcons name="pause" size={20} color={theme.onSurface} />
                      <Text style={styles.secondaryBtnText}>Pause</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.secondary }]} onPress={addLap}>
                      <MaterialIcons name="flag" size={20} color="#002113" />
                      <Text style={[styles.primaryBtnText, { color: '#002113' }]}>Lap</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.primaryBtn} onPress={startStopwatch}>
                    <MaterialIcons name="play-arrow" size={20} color="#002e6a" />
                    <Text style={styles.primaryBtnText}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dangerBtn} onPress={resetStopwatch}>
                  <MaterialIcons name="stop" size={20} color={theme.error} />
                  <Text style={styles.dangerBtnText}>Reset</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          {laps.length > 0 && (
            <View style={styles.lapsContainer}>
              <Text style={styles.lapsTitle}>Laps</Text>
              {laps.map((lap, i) => (
                <View key={lap.id} style={styles.lapItem}>
                  <Text style={styles.lapNumber}>Lap {lap.lap}</Text>
                  <Text style={styles.lapTime}>
                    {formatUnit(lap.time / 60)}:{formatUnit(lap.time % 60)}.{formatUnit((lap.time * 100) % 100)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Alarms */}
        <View style={[glassCard, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="alarm" size={22} color={theme.primary} />
            <Text style={styles.sectionTitle}>Alarms</Text>
              <TouchableOpacity onPress={openNewAlarm}>
              <MaterialIcons name="add-circle" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {alarms.length === 0 ? (
            <Text style={styles.emptyText}>No alarms set. Tap + to add one.</Text>
          ) : (
            alarms.map(alarm => {
              const s = getAlarmSound(alarm.sound);
              return (
              <TouchableOpacity key={alarm.id} style={styles.alarmItem} onPress={() => openEditAlarm(alarm)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alarmTimeText}>
                    {formatUnit(alarm.hour)}:{formatUnit(alarm.minute)}
                  </Text>
                  <Text style={styles.alarmLabel}>
                    {alarm.label}{alarm.repeat && alarm.repeat !== 'none' ? ` • ${alarm.repeat}` : ''}
                  </Text>
                  <View style={styles.alarmSoundRow}>
                    <MaterialIcons name={s.icon as any} size={14} color={theme.onSurfaceVariant} />
                    <Text style={styles.alarmSoundText}>{s.label}</Text>
                    <MaterialIcons name="volume-up" size={14} color={theme.onSurfaceVariant} />
                    <Text style={styles.alarmSoundText}>{Math.round((alarm.volume ?? 0.8) * 100)}%</Text>
                  </View>
                </View>
                <View style={styles.alarmActions}>
                  <TouchableOpacity
                    style={[styles.alarmToggle, alarm.active && styles.alarmToggleActive]}
                    onPress={() => { toggleAlarm(alarm.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <View style={[styles.alarmToggleDot, alarm.active && styles.alarmToggleDotActive]} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteAlarm(alarm.id)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color={theme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Routine */}
        <View style={[glassCard, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="timeline" size={22} color={theme.secondary} />
            <Text style={styles.sectionTitle}>Daily Routine</Text>
            <TouchableOpacity onPress={() => setShowRoutineModal(true)}>
              <MaterialIcons name="add-circle" size={24} color={theme.secondary} />
            </TouchableOpacity>
          </View>
          {nextRoutine && (
            <View style={styles.nextRoutineBanner}>
              <MaterialIcons name="notifications-active" size={18} color={theme.primary} />
              <Text style={styles.nextRoutineText}>Next: {nextRoutine.label} at {nextRoutine.time}</Text>
            </View>
          )}
          {routine.map(item => {
            const [rh, rm] = item.time.split(':').map(Number);
            const itemMinutes = rh * 60 + rm;
            const isPast = itemMinutes < currentTimeMinutes;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.routineItem, item.done && styles.routineItemDone]}
                onPress={() => toggleRoutineItem(item.id)}
                onLongPress={() => {
                  Alert.alert('Remove Item', `Remove "${item.label}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeRoutineItem(item.id) },
                  ]);
                }}
              >
                <View style={[styles.routineDot, item.done && styles.routineDotDone]} />
                <Text style={[styles.routineTime, item.done && { opacity: 0.4 }]}>{item.time}</Text>
                <MaterialIcons name={item.icon as any} size={18} color={item.done ? theme.onSurfaceVariant : theme.onSurfaceVariant} />
                <Text style={[styles.routineLabel, item.done && { opacity: 0.4, textDecorationLine: 'line-through' }]}>{item.label}</Text>
                {item.done && <MaterialIcons name="check-circle" size={18} color={theme.secondary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Timer History Modal */}
      <Modal visible={showHistory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timer History</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <MaterialIcons name="close" size={24} color={theme.onSurface} />
              </TouchableOpacity>
            </View>
            {timerHistory.length === 0 ? (
              <Text style={styles.emptyText}>No completed sessions yet.</Text>
            ) : (
              <FlatList
                data={timerHistory}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Text style={styles.historyDuration}>{formatUnit(item.duration / 60)}:{formatUnit(item.duration % 60)}</Text>
                    <Text style={styles.historyDate}>{new Date(item.completedAt).toLocaleString()}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Alarm Modal */}
      <Modal visible={showAlarmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingAlarmId ? 'Edit Alarm' : 'New Alarm'}</Text>
            <View style={styles.alarmPickerCols}>
              <View style={styles.alarmPickerCol}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <TouchableOpacity onPress={() => setNewAlarmH((newAlarmH + 1) % 24)}>
                  <Text style={styles.pickerArrow}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{formatUnit(newAlarmH)}</Text>
                <TouchableOpacity onPress={() => setNewAlarmH(newAlarmH === 0 ? 23 : newAlarmH - 1)}>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.pickerColon}>:</Text>
              <View style={styles.alarmPickerCol}>
                <Text style={styles.pickerLabel}>Min</Text>
                <TouchableOpacity onPress={() => setNewAlarmM((newAlarmM + 1) % 60)}>
                  <Text style={styles.pickerArrow}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{formatUnit(newAlarmM)}</Text>
                <TouchableOpacity onPress={() => setNewAlarmM(newAlarmM === 0 ? 59 : newAlarmM - 1)}>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Label (optional)"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newAlarmLabel}
              onChangeText={setNewAlarmLabel}
            />
            <View style={styles.repeatRow}>
              {(['daily', 'weekdays', 'none'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.repeatBtn, newAlarmRepeat === r && styles.repeatBtnActive]}
                  onPress={() => setNewAlarmRepeat(r)}
                >
                  <Text style={[styles.repeatBtnText, newAlarmRepeat === r && styles.repeatBtnTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.pickerLabel}>Sound</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.soundPickerRow}>
              {allSounds.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.soundOption, newAlarmSound === s.id && styles.soundOptionActive]}
                  onPress={() => { setNewAlarmSound(s.id); playPreview(s.id); }}
                >
                  <MaterialIcons name={s.icon as any} size={20} color={newAlarmSound === s.id ? theme.surface : theme.onSurfaceVariant} />
                  <Text style={[styles.soundOptionLabel, newAlarmSound === s.id && { color: theme.surface }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.volumeRow}>
              <MaterialIcons name="volume-down" size={20} color={theme.onSurfaceVariant} />
              <View style={styles.volumeDots}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setNewAlarmVolume((i + 1) / 10)}
                    style={[styles.volumeDot, { backgroundColor: i / 10 < newAlarmVolume ? theme.primary : theme.outlineVariant }]}
                  />
                ))}
              </View>
              <MaterialIcons name="volume-up" size={20} color={theme.onSurfaceVariant} />
              <Text style={styles.volumeText}>{Math.round(newAlarmVolume * 100)}%</Text>
            </View>
            <View style={styles.volumePresets}>
              {[{ label: 'Mute', value: 0 }, { label: 'Low', value: 0.3 }, { label: 'Med', value: 0.6 }, { label: 'High', value: 0.9 }, { label: 'Full', value: 1 }].map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.volumePreset, newAlarmVolume === p.value && styles.volumePresetActive]}
                  onPress={() => setNewAlarmVolume(p.value)}
                >
                  <Text style={[styles.volumePresetText, newAlarmVolume === p.value && styles.volumePresetTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => {
                setShowAlarmModal(false);
                setEditingAlarmId(null);
                previewSound?.unloadAsync();
              }}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddAlarm}>
                <Text style={styles.primaryBtnText}>{editingAlarmId ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Routine Modal */}
      <Modal visible={showRoutineModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine Item</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Time (HH:MM)"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newRoutineTime}
              onChangeText={setNewRoutineTime}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Label"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newRoutineLabel}
              onChangeText={setNewRoutineLabel}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowRoutineModal(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddRoutine}>
                <Text style={styles.primaryBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  clockCard: { padding: 24, borderRadius: 20, alignItems: 'center' },
  dateText: { fontSize: 14, fontWeight: '500', color: theme.primary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  clockText: { fontSize: 52, fontWeight: '700', color: theme.onSurface, letterSpacing: -2 },
  formatHint: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 8 },
  sectionCard: { padding: 16, borderRadius: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.onSurface, flex: 1 },
  bestLapText: { fontSize: 11, fontWeight: '500', color: theme.tertiary },
  timerInputRow: { alignItems: 'center', marginBottom: 12 },
  timerInput: {
    fontSize: 36, fontWeight: '700', color: theme.onSurface, textAlign: 'center',
    backgroundColor: theme.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.chipBorder,
    paddingVertical: 8, paddingHorizontal: 24, minWidth: 160,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  presetBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: theme.chipBg, borderRadius: 10,
    borderWidth: 1, borderColor: theme.chipBorder,
  },
  presetText: { fontSize: 13, fontWeight: '600', color: theme.secondary },
  timerDisplay: { fontSize: 48, fontWeight: '700', color: theme.onSurface, textAlign: 'center', marginBottom: 16 },
  timerControls: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  swDisplay: { fontSize: 42, fontWeight: '700', color: theme.onSurface, textAlign: 'center', marginBottom: 16, fontVariant: ['tabular-nums'] },
  swControls: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#002e6a' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.chipBg, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
    borderWidth: 1, borderColor: theme.chipBorder,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: theme.onSurface },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.chipBg, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
    borderWidth: 1, borderColor: theme.chipBorder,
  },
  dangerBtnText: { fontSize: 15, fontWeight: '600', color: theme.error },
  lapsContainer: { marginTop: 12 },
  lapsTitle: { fontSize: 14, fontWeight: '600', color: theme.onSurfaceVariant, marginBottom: 8 },
  lapItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.borderColor },
  lapNumber: { fontSize: 14, fontWeight: '500', color: theme.onSurface },
  lapTime: { fontSize: 14, fontWeight: '500', color: theme.onSurfaceVariant, fontVariant: ['tabular-nums'] },
  alarmItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.borderColor,
  },
  alarmTimeText: { fontSize: 20, fontWeight: '700', color: theme.onSurface },
  alarmLabel: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 2 },
  alarmActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alarmToggle: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: theme.outlineVariant,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  alarmToggleActive: { backgroundColor: theme.primary },
  alarmToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f4f3f4' },
  alarmToggleDotActive: { backgroundColor: '#002e6a', alignSelf: 'flex-end' },
  emptyText: { fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', paddingVertical: 16 },
  nextRoutineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.chipBg, padding: 10, borderRadius: 10, marginBottom: 12,
  },
  nextRoutineText: { fontSize: 13, fontWeight: '500', color: theme.primary, flex: 1 },
  routineItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderColor,
  },
  routineItemDone: { opacity: 0.6 },
  routineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.secondary },
  routineDotDone: { backgroundColor: theme.onSurfaceVariant },
  routineTime: { fontSize: 15, fontWeight: '600', color: theme.onSurface, width: 50 },
  routineLabel: { fontSize: 15, fontWeight: '500', color: theme.onSurfaceVariant, flex: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: theme.onSurface, marginBottom: 16 },
  modalInput: {
    fontSize: 16, color: theme.onSurface,
    backgroundColor: theme.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: theme.chipBorder,
    padding: 12, marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.borderColor,
  },
  historyDuration: { fontSize: 16, fontWeight: '600', color: theme.onSurface },
  historyDate: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
  alarmPickerCols: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginVertical: 16 },
  alarmPickerCol: { alignItems: 'center', gap: 4 },
  pickerLabel: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant, textTransform: 'uppercase' },
  pickerArrow: { fontSize: 28, color: theme.primary, padding: 4 },
  pickerValue: { fontSize: 40, fontWeight: '700', color: theme.onSurface },
  pickerColon: { fontSize: 40, fontWeight: '700', color: theme.onSurface, marginTop: 24 },
  repeatRow: { flexDirection: 'row', gap: 8, marginBottom: 12, justifyContent: 'center' },
  repeatBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: theme.chipBg,
  },
  repeatBtnActive: { backgroundColor: 'rgba(173,198,255,0.2)' },
  repeatBtnText: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant },
  repeatBtnTextActive: { color: theme.primary },
  soundPickerRow: { marginBottom: 12 },
  soundOption: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: theme.chipBg, marginRight: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: theme.chipBorder,
  },
  soundOptionActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  soundOptionLabel: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  volumeDots: { flexDirection: 'row', gap: 3, flex: 1 },
  volumeDot: { flex: 1, height: 24, borderRadius: 4 },
  volumeText: { fontSize: 13, fontWeight: '600', color: theme.onSurfaceVariant, minWidth: 36, textAlign: 'right' },
  volumePresets: { flexDirection: 'row', gap: 6, marginBottom: 12, justifyContent: 'center' },
  volumePreset: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: theme.chipBg, borderWidth: 1, borderColor: theme.chipBorder,
  },
  volumePresetActive: { backgroundColor: theme.primaryContainer, borderColor: theme.primary },
  volumePresetText: { fontSize: 12, fontWeight: '600', color: theme.onSurfaceVariant },
  volumePresetTextActive: { color: theme.primary },
  alarmSoundRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  alarmSoundText: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant },
  });
}
