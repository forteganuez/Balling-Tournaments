import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { HostMatchScreen } from '../screens/HostMatchScreen';
import { MatchScheduleScreen } from '../screens/MatchScheduleScreen';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import { TournamentDetailScreen } from '../screens/TournamentDetailScreen';
import { CreateTournamentScreen } from '../screens/CreateTournamentScreen';
import { SpectatorBracketScreen } from '../screens/SpectatorBracketScreen';
import { TournamentChatScreen } from '../screens/TournamentChatScreen';
import { SubmitResultScreen } from '../screens/SubmitResultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { AdminUsersScreen } from '../screens/AdminUsersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaymentHistoryScreen } from '../screens/PaymentHistoryScreen';
import type {
  AppTabParamList,
  HomeStackParamList,
  TournamentsStackParamList,
  ProfileStackParamList,
} from './types';
import { colors } from '../constants/theme';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TournamentsStack = createNativeStackNavigator<TournamentsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
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
  return (
    <TournamentsStack.Navigator>
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

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
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
    </ProfileStack.Navigator>
  );
}

function TabIcon({ label }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Tournaments: '🏆',
    Friends: '👥',
    Notifications: '🔔',
    Profile: '👤',
  };

  return (
    <Text className="text-xl">
      {icons[label] ?? '📋'}
    </Text>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen
        name="Tournaments"
        component={TournamentsNavigator}
        options={{ title: 'Tournaments' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
