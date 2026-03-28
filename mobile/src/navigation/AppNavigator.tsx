import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { HostMatchScreen } from '../screens/HostMatchScreen';
import { MatchScheduleScreen } from '../screens/MatchScheduleScreen';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import { TournamentDetailScreen } from '../screens/TournamentDetailScreen';
import { CreateTournamentScreen } from '../screens/CreateTournamentScreen';
import { SpectatorBracketScreen } from '../screens/SpectatorBracketScreen';
import { TournamentChatScreen } from '../screens/TournamentChatScreen';
import { SubmitResultScreen } from '../screens/SubmitResultScreen';
import { RankingScreen } from '../screens/RankingScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaymentHistoryScreen } from '../screens/PaymentHistoryScreen';
import { NotificationPreferencesScreen } from '../screens/NotificationPreferencesScreen';
import { ShopScreen } from '../screens/ShopScreen';
import type {
  AppTabParamList,
  HomeStackParamList,
  TournamentsStackParamList,
  RankingStackParamList,
  SocialStackParamList,
  ProfileStackParamList,
} from './types';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TournamentsStack = createNativeStackNavigator<TournamentsStackParamList>();
const RankingStack = createNativeStackNavigator<RankingStackParamList>();
const SocialStack = createNativeStackNavigator<SocialStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeNavigator() {
  const { theme } = useTheme();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="HostMatch"
        component={HostMatchScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="MatchSchedule"
        component={MatchScheduleScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function TournamentsNavigator() {
  const { theme } = useTheme();

  return (
    <TournamentsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <TournamentsStack.Screen
        name="TournamentList"
        component={TournamentsScreen}
        options={{ title: 'Tournaments' }}
      />
      <TournamentsStack.Screen
        name="TournamentDetail"
        component={TournamentDetailScreen}
        options={{ title: 'Tournament' }}
      />
      <TournamentsStack.Screen
        name="CreateTournament"
        component={CreateTournamentScreen}
        options={{ headerShown: false }}
      />
      <TournamentsStack.Screen
        name="SpectatorBracket"
        component={SpectatorBracketScreen}
        options={{ title: 'Live Bracket' }}
      />
      <TournamentsStack.Screen
        name="TournamentChat"
        component={TournamentChatScreen}
        options={{ title: 'Chat' }}
      />
      <TournamentsStack.Screen
        name="SubmitResult"
        component={SubmitResultScreen}
        options={{ title: 'Submit Result' }}
      />
    </TournamentsStack.Navigator>
  );
}

function RankingNavigator() {
  const { theme } = useTheme();

  return (
    <RankingStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <RankingStack.Screen
        name="RankingMain"
        component={RankingScreen}
        options={{ title: 'Ranking' }}
      />
      <RankingStack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ title: 'Player Profile' }}
      />
    </RankingStack.Navigator>
  );
}

function SocialNavigator() {
  const { theme } = useTheme();

  return (
    <SocialStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <SocialStack.Screen
        name="SocialMain"
        component={SocialScreen}
        options={{ title: 'Social' }}
      />
      <SocialStack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ title: 'Player Profile' }}
      />
    </SocialStack.Navigator>
  );
}

function ProfileNavigator() {
  const { theme } = useTheme();

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <ProfileStack.Screen
        name="MyProfile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ title: 'Player Profile' }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <ProfileStack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: 'Manage Roles' }}
      />
      <ProfileStack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ title: 'Payment History' }}
      />
      <ProfileStack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ title: 'Notifications' }}
      />
      <ProfileStack.Screen
        name="Shop"
        component={ShopScreen}
        options={{ title: 'Shop' }}
      />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ label }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Tournaments: '🏆',
    Ranking: '🏅',
    Social: '👥',
    Profile: '👤',
  };

  return (
    <Text className="text-xl">
      {icons[label] ?? '📋'}
    </Text>
  );
}

export function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        sceneStyle: { backgroundColor: theme.background },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen
        name="Tournaments"
        component={TournamentsNavigator}
        options={{ title: 'Tournaments' }}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingNavigator}
        options={{ title: 'Ranking' }}
      />
      <Tab.Screen
        name="Social"
        component={SocialNavigator}
        options={{ title: 'Social' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
