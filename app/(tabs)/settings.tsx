import { useState, useMemo } from 'react';
import {
  ScrollView, View, Text, TextInput, Image, StyleSheet,
  TouchableOpacity, Switch, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { Theme } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

const FOCUS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const BREAK_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 25, 30];
const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];

export default function SettingsScreen() {
  const { settings, updateSettings, theme } = useApp();

  const glassCard = { backgroundColor: theme.glassBg, borderWidth: 1, borderColor: theme.glassBorder };

  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [profileName, setProfileName] = useState(settings.profileName);
  const [profileEmail, setProfileEmail] = useState(settings.profileEmail);

  const toggleSwitch = (key: string) => {
    updateSettings({ [key]: !settings[key as keyof typeof settings] });
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => Alert.alert('Signed out', 'You have been signed out successfully.') },
    ]);
  };

  const handleSaveProfile = () => {
    updateSettings({ profileName, profileEmail });
    setShowProfileModal(false);
    Alert.alert('Profile Updated', 'Your profile has been saved.');
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.avatarImg} />
          </View>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.profileCard} onPress={() => setShowProfileModal(true)} activeOpacity={0.7}>
          <View style={styles.profileAvatar}>
            <Image source={require('@/assets/images/icon.png')} style={styles.profileAvatarImg} />
          </View>
          <View>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>{profileEmail}</Text>
          </View>
          <MaterialIcons name="edit" size={20} color={theme.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={[glassCard, styles.sectionCard]}>
          {([
            { icon: 'dark-mode', label: 'Dark Mode', key: 'darkMode' },
            { icon: 'notifications', label: 'Push Notifications', key: 'notifications' },
            { icon: 'vibration', label: 'Vibration', key: 'vibration' },
            { icon: 'music-note', label: 'Sound', key: 'sound' },
          ] as const).map((item, i, arr) => (
            <View key={item.key} style={[styles.settingItem, i < arr.length - 1 && styles.settingItemBorder]}>
              <View style={styles.settingLeft}>
                <MaterialIcons name={item.icon as any} size={22} color={theme.onSurfaceVariant} />
                <Text style={styles.settingLabel}>{item.label}</Text>
              </View>
              <Switch
                value={!!settings[item.key]}
                onValueChange={() => toggleSwitch(item.key)}
                trackColor={{ false: theme.outlineVariant, true: theme.primary }}
                thumbColor={settings[item.key] ? '#002e6a' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Focus & Timer</Text>
        <View style={[glassCard, styles.sectionCard]}>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemBorder]} onPress={() => setShowFocusModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="timer" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Focus Duration</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings.focusDuration} min</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemBorder]} onPress={() => setShowBreakModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="coffee" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Break Duration</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings.breakDuration} min</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowGoalModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="flag" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Daily Goal</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings.dailyGoal} sessions</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[glassCard, styles.sectionCard]}>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemBorder]} onPress={() => setShowProfileModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="person" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Profile</Text>
            </View>
            <View style={styles.settingRight}>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.settingItemBorder]} onPress={() => setShowPrivacyModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="security" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>Privacy</Text>
            </View>
            <View style={styles.settingRight}>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowAboutModal(true)}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="info" size={22} color={theme.onSurfaceVariant} />
              <Text style={styles.settingLabel}>About HabitClock</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>v1.0.0</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color={theme.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFocusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Focus Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {FOCUS_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerChip, settings.focusDuration === m && styles.pickerChipActive]}
                  onPress={() => updateSettings({ focusDuration: m })}
                >
                  <Text style={[styles.pickerChipText, settings.focusDuration === m && styles.pickerChipTextActive]}>{m} min</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowFocusModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showBreakModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Break Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {BREAK_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pickerChip, settings.breakDuration === m && styles.pickerChipActive]}
                  onPress={() => updateSettings({ breakDuration: m })}
                >
                  <Text style={[styles.pickerChipText, settings.breakDuration === m && styles.pickerChipTextActive]}>{m} min</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowBreakModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showGoalModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Goal</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {GOAL_OPTIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.pickerChip, settings.dailyGoal === n && styles.pickerChipActive]}
                  onPress={() => updateSettings({ dailyGoal: n })}
                >
                  <Text style={[styles.pickerChipText, settings.dailyGoal === n && styles.pickerChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowGoalModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor={theme.onSurfaceVariant}
              value={profileName}
              onChangeText={setProfileName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor={theme.onSurfaceVariant}
              value={profileEmail}
              onChangeText={setProfileEmail}
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowProfileModal(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleSaveProfile}>
                <Text style={styles.modalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} transparent animationType="slide">
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <View style={[styles.infoModalIconWrap, { backgroundColor: theme.primary + '22' }]}>
                <MaterialIcons name="info" size={28} color={theme.primary} />
              </View>
              <Text style={styles.infoModalTitle}>About HabitClock</Text>
            </View>
            <ScrollView style={styles.infoModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.infoModalText}>
                HabitClock is a smart and simple productivity and health tracking application designed to help users manage their daily routines effectively. It combines essential features like a to-do list, real-time clock, and fitness tracking in one unified platform.
              </Text>
              <Text style={styles.infoModalText}>
                The app helps users stay organized, improve time management, and build healthy habits such as drinking water and staying active. With a clean and user-friendly interface, HabitClock focuses on simplicity and efficiency without requiring login or internet access.
              </Text>
              <Text style={styles.infoModalText}>
                It is ideal for students, developers, and professionals who want to balance productivity and health in their daily life.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.infoModalBtn} onPress={() => setShowAboutModal(false)} activeOpacity={0.7}>
              <Text style={styles.infoModalBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalContent}>
            <View style={styles.infoModalHeader}>
              <View style={[styles.infoModalIconWrap, { backgroundColor: theme.secondary + '22' }]}>
                <MaterialIcons name="security" size={28} color={theme.secondary} />
              </View>
              <Text style={styles.infoModalTitle}>Privacy</Text>
            </View>
            <ScrollView style={styles.infoModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.infoModalText}>
                HabitClock respects user privacy and ensures that all personal data remains {'\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924'} and protected.
              </Text>
              <Text style={styles.infoModalText}>
                This application does not require user login or collect any personal information such as name, email, or location. All data, including tasks and fitness inputs, is stored locally on the user's device and is not shared with any third party.
              </Text>
              <Text style={styles.infoModalText}>
                The app operates fully offline and does not use external servers or tracking systems. Users have full control over their data and can delete or reset it at any time.
              </Text>
              <Text style={styles.infoModalText}>
                HabitClock is designed to provide a safe, simple, and private experience for managing daily routines and health habits.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.infoModalBtn} onPress={() => setShowPrivacyModal(false)} activeOpacity={0.7}>
              <Text style={styles.infoModalBtnText}>Got it</Text>
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
    avatarImg: { width: 40, height: 40, borderRadius: 20 },
    avatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(173, 198, 255, 0.2)',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(173, 198, 255, 0.3)',
    },
    title: { fontSize: 20, fontWeight: '700', color: theme.onSurface },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 8, paddingBottom: 100 },
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16,
      backgroundColor: theme.glassBg, borderRadius: 16,
      borderWidth: 1, borderColor: theme.glassBorder, marginBottom: 8,
    },
    profileAvatar: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(173, 198, 255, 0.3)',
    },
    profileAvatarImg: { width: 56, height: 56, borderRadius: 28 },
    profileName: { fontSize: 18, fontWeight: '600', color: theme.onSurface },
    profileEmail: { fontSize: 13, fontWeight: '500', color: theme.onSurfaceVariant, marginTop: 2 },
    sectionTitle: {
      fontSize: 13, fontWeight: '600', color: theme.onSurfaceVariant,
      letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 8, marginLeft: 4,
    },
    sectionCard: { borderRadius: 16, overflow: 'hidden' },
    settingItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 16,
    },
    settingItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.borderColor },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    settingLabel: { fontSize: 15, fontWeight: '500', color: theme.onSurface },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    settingValue: { fontSize: 14, fontWeight: '500', color: theme.onSurfaceVariant },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24,
      paddingVertical: 14, backgroundColor: 'rgba(255, 180, 171, 0.1)',
      borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255, 180, 171, 0.2)',
    },
    logoutText: { fontSize: 15, fontWeight: '600', color: theme.error },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, maxHeight: '60%',
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.onSurface, marginBottom: 16 },
    modalInput: {
      fontSize: 16, color: theme.onSurface,
      backgroundColor: theme.inputBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.inputBorder,
      padding: 12, marginBottom: 12,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
    modalPrimaryBtn: {
      backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
    },
    modalPrimaryText: { fontSize: 15, fontWeight: '700', color: '#002e6a' },
    modalSecondaryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    modalSecondaryText: { fontSize: 15, fontWeight: '600', color: theme.onSurface },
    pickerRow: { gap: 8, paddingVertical: 8 },
    pickerChip: {
      paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12,
      backgroundColor: theme.chipBg,
      borderWidth: 1, borderColor: theme.chipBorder,
    },
    pickerChipActive: { backgroundColor: 'rgba(173,198,255,0.2)', borderColor: theme.primary },
    pickerChipText: { fontSize: 15, fontWeight: '500', color: theme.onSurfaceVariant },
    pickerChipTextActive: { color: theme.primary, fontWeight: '700' },
    modalDoneBtn: {
      alignSelf: 'center', marginTop: 16,
      backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 40, borderRadius: 12,
    },
    modalDoneText: { fontSize: 15, fontWeight: '700', color: '#002e6a' },
    infoModalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
    },
    infoModalContent: {
      backgroundColor: theme.surfaceHigh, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, maxHeight: '70%',
    },
    infoModalHeader: { alignItems: 'center', gap: 12, marginBottom: 20 },
    infoModalIconWrap: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
    },
    infoModalTitle: { fontSize: 20, fontWeight: '700', color: theme.onSurface },
    infoModalScroll: { maxHeight: 300 },
    infoModalText: {
      fontSize: 15, fontWeight: '400', color: theme.onSurfaceVariant,
      lineHeight: 24, marginBottom: 16,
    },
    infoModalBtn: {
      width: '100%', alignItems: 'center', paddingVertical: 14, marginTop: 12,
      backgroundColor: theme.primary, borderRadius: 14,
    },
    infoModalBtnText: { fontSize: 16, fontWeight: '700', color: theme.surface },
  });
}
