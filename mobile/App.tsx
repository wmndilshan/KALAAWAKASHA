import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { RootStackParamList } from "./src/lib/navigation";
import { AppShell } from "./src/components/AppShell";
import { colors, commonStyles, shadow } from "./src/lib/theme";
import { LoginScreen } from "./src/screens/LoginScreen";
import { AddTicketScreen } from "./src/screens/AddTicketScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { ManualVerifyScreen } from "./src/screens/ManualVerifyScreen";
import { SearchTicketScreen } from "./src/screens/SearchTicketScreen";
import { TicketDetailsScreen } from "./src/screens/TicketDetailsScreen";
import { RecentActivityScreen } from "./src/screens/RecentActivityScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: { navigation: any }) {
  const actions = [
    { title: "Add Ticket", subtitle: "Issue a new ticket", icon: "+", route: "AddTicket", tone: colors.ember },
    { title: "Scan QR", subtitle: "Fast gate check-in", icon: "⌗", route: "Scanner", tone: colors.ink },
    { title: "Manual Verify", subtitle: "Use ID, ticket and code", icon: "✓", route: "ManualVerify", tone: colors.pine },
    { title: "All Tickets", subtitle: "Browse the database table", icon: "⌕", route: "SearchTicket", tone: colors.gold },
  ];

  return (
    <AppShell title="Gate Ops" subtitle="Ready for ticket checks and entry decisions.">
      <View style={styles.heroCard}>
        <Text style={styles.heroNumber}>Live Desk</Text>
        <Text style={styles.heroText}>Scan, verify, search, and check in tickets from one mobile workspace.</Text>
      </View>

      <View style={styles.actionGrid}>
        {actions.map((item) => (
          <Pressable key={item.route} style={styles.actionCard} onPress={() => navigation.navigate(item.route)}>
            <View style={[styles.iconBubble, { backgroundColor: item.tone }]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <Text style={styles.actionTitle}>{item.title}</Text>
            <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.signOutButton}
        onPress={async () => {
          await supabase.auth.signOut();
          Alert.alert("Signed out");
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </AppShell>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      {!session ? (
        <LoginScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.mist },
              headerTintColor: colors.ink,
              headerTitleStyle: { fontWeight: "900" },
              contentStyle: { backgroundColor: colors.mist },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Organizer", headerShown: false }} />
            <Stack.Screen name="AddTicket" component={AddTicketScreen} options={{ title: "Add Ticket" }} />
            <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: "Scanner" }} />
            <Stack.Screen name="ManualVerify" component={ManualVerifyScreen} options={{ title: "Manual Verify" }} />
            <Stack.Screen name="SearchTicket" component={SearchTicketScreen} options={{ title: "Search Tickets" }} />
            <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} options={{ title: "Ticket Details" }} />
            <Stack.Screen name="RecentActivity" component={RecentActivityScreen} options={{ title: "Recent Activity" }} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    padding: 18,
    minHeight: 130,
    justifyContent: "space-between",
    ...shadow,
  },
  heroNumber: { color: colors.white, fontSize: 28, fontWeight: "900" },
  heroText: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 21 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "48%",
    minHeight: 150,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    justifyContent: "space-between",
    ...shadow,
  },
  iconBubble: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconText: { color: colors.white, fontWeight: "900", fontSize: 20 },
  actionTitle: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  actionSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  signOutButton: { ...commonStyles.secondaryButton, backgroundColor: "rgba(196,65,31,0.1)" },
  signOutText: { color: colors.ember, fontWeight: "900" },
});
