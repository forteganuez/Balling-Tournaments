import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import { TournamentDetailScreen } from '../screens/TournamentDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { PlayerProfileScreen } from '../screens/PlayerProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type {
  AppTabParamList,
  TournamentsStackParamList,
  ProfileStackParamList,
} from './types';
import { colors } from '../constants/theme';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TournamentsStack = createNativeStackNavigator<TournamentsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

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
      <Tab.Screen name="Home" component={HomeScreen} />
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
