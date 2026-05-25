import { Tabs } from 'expo-router';
import { Platform, Text, type ColorValue, type TextStyle } from 'react-native';

/** Bottom-tab icons. We use a single text glyph per tab to avoid pulling
 *  an icon font dependency and to match the web app's clean type-led style. */
function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  const style: TextStyle = { fontSize: 22, color, lineHeight: 24 };
  return <Text style={style}>{symbol}</Text>;
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
        name="visit"
        options={{
          title: 'Visit',
          tabBarIcon: ({ color }) => <TabIcon symbol="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: 'Business',
          tabBarIcon: ({ color }) => <TabIcon symbol="◫" color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => <TabIcon symbol="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <TabIcon symbol="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon symbol="≡" color={color} />,
        }}
      />
    </Tabs>
  );
}
