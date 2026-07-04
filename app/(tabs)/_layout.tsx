import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { useApp } from '@/context/AppContext';

export default function TabLayout() {
  const { theme } = useApp();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.secondary,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="dashboard" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="access-time" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="checklist" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fitness"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="fitness-center" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
