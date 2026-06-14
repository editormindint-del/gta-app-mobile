import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Render a single Ionicons glyph for the bottom tab bar. Using filled
 *  variants for stronger presence against the dark background. */
function TabIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: ColorValue }) {
  return <Ionicons name={name} size={22} color={color as string} />;
}

/** Visible tab-bar content height (icons + label). The actual bar grows by
 *  insets.bottom so it always sits above the home indicator / gesture nav. */
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function TabLayout() {
  // Pull the bottom safe-area inset so the tab bar lifts above:
  //   - iPhone home-indicator strip (~34pt)
  //   - Android gesture-nav swipe area (~24-48dp, varies by device)
  //   - Android 3-button nav (already handled by the OS, inset = 0)
  // The previous hardcoded Platform.OS === 'android' ? 8 : 28 wasn't enough
  // on Android gesture-nav devices: the tab labels sat under the system
  // swipe zone, so a tap on Business/Live/etc. triggered the OS back gesture
  // instead of the tab.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#f7b81e',
        tabBarInactiveTintColor: '#9aa39d',
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 0.5,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Visit',
          tabBarIcon: ({ color }) => <TabIcon name="location-sharp" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: 'Business',
          tabBarIcon: ({ color }) => <TabIcon name="briefcase" color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <TabIcon name="radio" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <TabIcon name="basket" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon name="menu" color={color} />,
        }}
      />
    </Tabs>
  );
}
