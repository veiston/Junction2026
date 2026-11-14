import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiTabButton } from "@/components/AiTabButton";
import { Icon, type IconName } from "@/components/Icon";
import { brand } from "@/config";
import { colors, iconSize } from "@/theme";

const TAB_BAR_HEIGHT = 64;

type TabConfig = {
  name: string;
  title: string;
  icon: IconName;
  focusedIcon: IconName;
};

const TABS_BEFORE_AI: TabConfig[] = [
  { name: "index", title: "Koti", icon: "home-outline", focusedIcon: "home" },
  { name: "etukortti", title: brand.cardName, icon: "credit-card-outline", focusedIcon: "credit-card" },
];

const TABS_AFTER_AI: TabConfig[] = [
  { name: "pankki", title: brand.bankName, icon: "wallet-outline", focusedIcon: "wallet" },
  { name: "mina", title: "Minä", icon: "account-outline", focusedIcon: "account" },
];

function TabIcon({ tab, focused }: { tab: TabConfig; focused: boolean }) {
  if (focused) {
    return <Icon name={tab.focusedIcon} size={iconSize.tab} color={colors.brand} />;
  }
  return <Icon name={tab.icon} size={iconSize.tab} color={colors.textSubtle} />;
}

function renderTab(tab: TabConfig) {
  return (
    <Tabs.Screen
      key={tab.name}
      name={tab.name}
      options={{
        title: tab.title,
        tabBarIcon: ({ focused }) => <TabIcon tab={tab} focused={focused} />,
      }}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // The screens render with the system font until Plus Jakarta Sans has loaded.
  useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { height: TAB_BAR_HEIGHT + insets.bottom },
      }}
    >
      {TABS_BEFORE_AI.map(renderTab)}
      <Tabs.Screen name="ai" options={{ title: "AI", tabBarButton: AiTabButton }} />
      {TABS_AFTER_AI.map(renderTab)}
      <Tabs.Screen name="dev/gallery" options={{ href: null }} />
    </Tabs>
  );
}
