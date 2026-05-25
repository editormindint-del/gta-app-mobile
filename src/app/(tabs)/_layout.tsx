import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

/** Render a single Ionicons glyph for the bottom tab bar. Using filled
 *  variants for stronger presence against the dark background. */
function TabIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: ColorValue }) {
  return <Ionicons name={name} size={22} color={color as string} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#f7b81e', // GTA gold
        tabBarInactiveTintColor: '#9aa39d',
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
