import { useState, useMemo } from 'react';
import {
  ScrollView, View, Text, TextInput, Image, StyleSheet,
  TouchableOpacity, Animated, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export default function TasksScreen() {
  const {
    tasks, addTask, toggleTask, deleteTask, archivedTasks, archiveCompleted,
    streak, getActiveTasks, theme,
  } = useApp();

  const CATEGORIES = [
    { key: null, label: 'None', color: theme.onSurfaceVariant },
    { key: 'Work', label: 'Work', color: '#adc6ff' },
    { key: 'Meeting', label: 'Meeting', color: '#d0bcff' },
    { key: 'Fitness', label: 'Fitness', color: '#4edea3' },
    { key: 'Personal', label: 'Personal', color: '#ffb4ab' },
    { key: 'Health', label: 'Health', color: '#6ffbbe' },
  ];

  const PRIORITIES = [
    { key: 'low', label: 'Low', color: theme.onSurfaceVariant },
    { key: 'medium', label: 'Medium', color: '#ffd666' },
    { key: 'high', label: 'High', color: '#ffb4ab' },
  ] as const;

  const glassCard = { backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder };

  const [inputText, setInputText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string | undefined>(undefined);
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  const animRef = useState(() => new Animated.Value(0))[0];
  const rotateAnim = animRef.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '180deg'],
  });

  const styles = useMemo(() => createStyles(theme), [theme]);

  const toggleCompletedSection = () => {
    setShowCompleted(!showCompleted);
    Animated.spring(animRef, {
      toValue: showCompleted ? 0 : 1, useNativeDriver: true,
    }).start();
  };

  const handleQuickAdd = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, done: false, category: filter || undefined, priority: 'medium' });
    setInputText('');
  };

  const handleAddWithDetails = () => {
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim(), done: false, category: newCategory, priority: newPriority, dueDate: newDueDate || undefined });
    setShowAddModal(false);
    setNewTitle('');
    setNewCategory(undefined);
    setNewPriority('medium');
    setNewDueDate('');
  };

  const activeTasks = getActiveTasks();
  const completedTasks = tasks.filter(t => t.done);
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
  const filtered = filter
    ? tasks.filter(t => t.category === filter)
    : tasks;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.avatarImg} />
          </View>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={archiveCompleted}>
            <MaterialIcons name="archive" size={22} color={theme.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddModal(true)}>
            <MaterialIcons name="playlist-add" size={22} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Add */}
        <View style={[glassCard, styles.inputCard]}>
          <TextInput
            style={styles.input}
            placeholder="Quick add task..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleQuickAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleQuickAdd}>
            <MaterialIcons name="add" size={24} color="#002e6a" />
          </TouchableOpacity>
        </View>

        {/* Streak & Progress */}
        <View style={styles.statsRow}>
          <View style={[glassCard, styles.statItem]}>
            <Text style={styles.statNumber}>{activeTasks.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[glassCard, styles.statItem]}>
            <Text style={[styles.statNumber, { color: theme.secondary }]}>
              {Math.round(progress * 100)}%
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[glassCard, styles.statItem]}>
            <Text style={[styles.statNumber, { color: theme.tertiary }]}>🔥 {streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !filter && styles.filterChipActive]} onPress={() => setFilter(null)}>
            <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.filter(c => c.key).map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterChip, filter === c.key && styles.filterChipActive]}
              onPress={() => setFilter(filter === c.key ? null : c.key!)}
            >
              <View style={[styles.filterDot, { backgroundColor: c.color }]} />
              <Text style={[styles.filterText, filter === c.key && styles.filterTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <Text style={styles.countText}>{filtered.filter(t => !t.done).length} remaining</Text>
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No tasks yet. Add one above!</Text>
        ) : (
          filtered.map(task => (
            <View key={task.id} style={[glassCard, styles.taskItem]}>
              <TouchableOpacity
                style={[styles.checkbox, task.done && styles.checkboxDone]}
                onPress={() => toggleTask(task.id)}
              >
                {task.done && <MaterialIcons name="check" size={14} color="#002113" />}
              </TouchableOpacity>
              <View style={styles.taskInfo}>
                <View style={styles.taskTitleRow}>
                  <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text>
                  {task.priority === 'high' && <MaterialIcons name="priority-high" size={16} color="#ffb4ab" />}
                </View>
                <View style={styles.taskMetaRow}>
                  {task.category && (
                    <View style={[styles.categoryBadge, { borderColor: CATEGORIES.find(c => c.key === task.category)?.color || theme.outline }]}>
                      <Text style={[styles.categoryText, { color: CATEGORIES.find(c => c.key === task.category)?.color || theme.outline }]}>{task.category}</Text>
                    </View>
                  )}
                  {task.dueDate && <Text style={styles.dueText}>Due: {task.dueDate}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={20} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Completed Section */}
        <View style={styles.completedSection}>
          <TouchableOpacity style={styles.completedHeader} onPress={toggleCompletedSection}>
            <Animated.View style={{ transform: [{ rotate: rotateAnim }] }}>
              <MaterialIcons name="expand-more" size={20} color={theme.onSurfaceVariant} />
            </Animated.View>
            <Text style={styles.completedTitle}>Completed ({completedTasks.length})</Text>
          </TouchableOpacity>

          {showCompleted && completedTasks.map(task => (
            <View key={task.id} style={[glassCard, styles.completedItem]}>
              <View style={styles.completedCheck}>
                <MaterialIcons name="check" size={16} color="#002113" />
              </View>
              <Text style={styles.completedText}>{task.title}</Text>
              <TouchableOpacity onPress={() => deleteTask(task.id)}>
                <MaterialIcons name="delete-outline" size={18} color={theme.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          ))}
          {completedTasks.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={archiveCompleted}>
              <Text style={styles.clearBtnText}>Clear All Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Archived */}
        {archivedTasks.length > 0 && (
          <Text style={styles.archivedText}>{archivedTasks.length} tasks archived</Text>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Task title"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Due date (optional, e.g. 2026-07-05)"
              placeholderTextColor={theme.onSurfaceVariant}
              value={newDueDate}
              onChangeText={setNewDueDate}
            />
            <Text style={styles.pickerLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key || 'none'}
                  style={[styles.pickerChip, newCategory === c.key && styles.pickerChipActive]}
                  onPress={() => setNewCategory(c.key || undefined)}
                >
                  <View style={[styles.filterDot, { backgroundColor: c.color }]} />
                  <Text style={[styles.pickerChipText, newCategory === c.key && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.pickerLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.priorityChip, newPriority === p.key && styles.priorityChipActive]}
                  onPress={() => setNewPriority(p.key)}
                >
                  <Text style={[styles.priorityText, { color: p.color }, newPriority === p.key && { fontWeight: '700' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddWithDetails}>
                <Text style={styles.primaryBtnText}>Add Task</Text>
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
    title: { fontSize: 20, fontWeight: '700', color: theme.onSurface },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 100 },
    inputCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, gap: 12 },
    input: {
      flex: 1, paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: theme.inputBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.inputBorder,
      fontSize: 16, color: theme.onSurface,
    },
    addBtn: {
      width: 48, height: 48, borderRadius: 12,
      backgroundColor: theme.primaryContainer, alignItems: 'center', justifyContent: 'center',
    },
    statsRow: { flexDirection: 'row', gap: 12 },
    statItem: {
      flex: 1, padding: 14, borderRadius: 16, alignItems: 'center',
    },
    statNumber: { fontSize: 22, fontWeight: '700', color: theme.onSurface },
    statLabel: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 2 },
    progressBarBg: {
      width: '100%', height: 6, backgroundColor: theme.chipBg,
      borderRadius: 3, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 3 },
    filterRow: { marginVertical: 4, marginBottom: 12 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20,
      backgroundColor: theme.chipBg, marginRight: 8,
    },
    filterChipActive: { backgroundColor: 'rgba(173,198,255,0.2)' },
    filterDot: { width: 8, height: 8, borderRadius: 4 },
    filterText: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant },
    filterTextActive: { color: theme.primary },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.onSurface },
    countText: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant },
    emptyText: { fontSize: 14, color: theme.onSurfaceVariant, textAlign: 'center', paddingVertical: 20 },
    taskItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16,
    },
    checkbox: {
      width: 24, height: 24, borderRadius: 6,
      borderWidth: 2, borderColor: theme.outline,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: theme.secondary, borderColor: theme.secondary },
    taskInfo: { flex: 1 },
    taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    taskTitle: { fontSize: 15, fontWeight: '500', color: theme.onSurface },
    taskTitleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
    taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    categoryBadge: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
      borderWidth: 1,
    },
    categoryText: { fontSize: 11, fontWeight: '500' },
    dueText: { fontSize: 11, fontWeight: '500', color: theme.onSurfaceVariant },
    deleteBtn: { padding: 4, opacity: 0.7 },
    completedSection: { marginTop: 8 },
    completedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    completedTitle: { fontSize: 14, fontWeight: '500', color: theme.onSurfaceVariant },
    completedItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12, borderRadius: 16, marginBottom: 8,
      backgroundColor: theme.chipBg,
    },
    completedCheck: {
      width: 24, height: 24, borderRadius: 6,
      backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center',
    },
    completedText: {
      fontSize: 14, fontWeight: '500', color: theme.onSurface,
      textDecorationLine: 'line-through', flex: 1,
    },
    clearBtn: { alignItems: 'center', paddingVertical: 10 },
    clearBtnText: { fontSize: 13, fontWeight: '500', color: theme.error },
    archivedText: { fontSize: 12, fontWeight: '500', color: theme.onSurfaceVariant, textAlign: 'center' },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.onSurface, marginBottom: 16 },
    modalInput: {
      fontSize: 16, color: theme.onSurface,
      backgroundColor: theme.inputBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.inputBorder,
      padding: 12, marginBottom: 12,
    },
    pickerLabel: { fontSize: 13, fontWeight: '600', color: theme.onSurfaceVariant, marginBottom: 8 },
    pickerChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
      backgroundColor: theme.chipBg, marginRight: 8,
    },
    pickerChipActive: { backgroundColor: 'rgba(173,198,255,0.15)' },
    pickerChipText: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant },
    priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    priorityChip: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      backgroundColor: theme.chipBg, alignItems: 'center',
    },
    priorityChipActive: { backgroundColor: theme.chipBorder },
    priorityText: { fontSize: 13, fontWeight: '500' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
    },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#002e6a' },
    secondaryBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
    },
    secondaryBtnText: { fontSize: 15, fontWeight: '600', color: theme.onSurface },
  });
}
