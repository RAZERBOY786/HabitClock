export interface AlarmSound {
  id: string;
  label: string;
  source: { uri: string } | number;
  icon: string;
}

// Verified working URLs from the rse/soundfx GitHub repo (CC0 licensed)
const FREE_SOUNDS: { id: string; label: string; url: string; icon: string }[] = [
  { id: 'classic',  label: 'Classic',  url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/alarm1.mp3',   icon: 'alarm' },
  { id: 'gentle',   label: 'Gentle',   url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/chime1.mp3',   icon: 'nightlight' },
  { id: 'beep',     label: 'Beep',     url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/beep1.mp3',    icon: 'notifications' },
  { id: 'buzzer',   label: 'Buzzer',   url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/alarm2.mp3',   icon: 'speaker' },
  { id: 'urgent',   label: 'Urgent',   url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/alarm3.mp3',   icon: 'warning' },
  { id: 'short',    label: 'Short',    url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/alarm4.mp3',   icon: 'timer' },
  { id: 'digital',  label: 'Digital',  url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/beep4.mp3',    icon: 'watch' },
  { id: 'bling',    label: 'Bling',    url: 'https://raw.githubusercontent.com/rse/soundfx/master/soundfx.d/bling2.mp3',   icon: 'tune' },
];

// Place your custom .ogg/.mp3 files in assets/sounds/ and register them here:
// import { Audio } from 'expo-av';
// const LOCAL_SOUNDS: { id: string; label: string; source: number; icon: string }[] = [
//   { id: 'custom1', label: 'Custom 1', source: require('@/assets/sounds/your-file.mp3'), icon: 'graphic-eq' },
// ];

export function getAlarmSound(soundId?: string): AlarmSound {
  const found = FREE_SOUNDS.find(s => s.id === soundId);
  if (found) return { id: found.id, label: found.label, source: { uri: found.url }, icon: found.icon };
  return { id: 'classic', label: 'Classic', source: { uri: FREE_SOUNDS[0].url }, icon: 'alarm' };
}

export function getAllSounds(): AlarmSound[] {
  return FREE_SOUNDS.map(s => ({ id: s.id, label: s.label, source: { uri: s.url }, icon: s.icon }));
}
