import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const PILL_H = 54;
const CIRCLE = 58;
const CONTAINER_H = 104;
const PILL_START = CONTAINER_H - PILL_H; // 50 — Abstand Pill-Oberkante vom Container-Top
const BORDER_COLOR = '#7aaac8';

// Inaktives Icon: vertikal in der Pille zentriert
const INACTIVE_ICON_SIZE = 24;
const INACTIVE_TOP = PILL_START + PILL_H / 2 - INACTIVE_ICON_SIZE / 2; // 50+27-12 = 65

// Aktiver Kreis: Kreis-Oberkante liegt am Container-Top (Kreis ragt über die Pille)
const ACTIVE_CIRCLE_TOP = 2;

const ICONS: Record<string, [active: string, inactive: string]> = {
  index:        ['receipt',    'receipt-outline'],
  bestellungen: ['bag-handle', 'bag-handle-outline'],
  profil:       ['person',     'person-outline'],
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {/* Blaue Pille */}
      <View style={styles.pill} />

      {/* Tab-Buttons */}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const [activeIcon, inactiveIcon] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tab}>
              {isFocused ? (
                <View style={[styles.circle, { marginTop: ACTIVE_CIRCLE_TOP }]}>
                  <Ionicons name={activeIcon as any} size={26} color="#18345d" />
                </View>
              ) : (
                <View style={{ marginTop: INACTIVE_TOP }}>
                  <Ionicons name={inactiveIcon as any} size={INACTIVE_ICON_SIZE} color="#5588aa" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 28,
    left: 12,
    right: 12,
    height: CONTAINER_H,
  },
  pill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PILL_H,
    backgroundColor: '#c5ddf0',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  row: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: '#c5ddf0',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bestellungen" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
