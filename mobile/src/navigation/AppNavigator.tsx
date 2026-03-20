import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { TournamentsScreen } from '../screens/TournamentsScreen';
import { TournamentDetailScreen } from '../screens/TournamentDetailScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import type { AppTabParamList, TournamentsStackParamList } from './types';
import { colors } from '../constants/theme';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<AppTabParamList>();
const TournamentsStack = createNativeStackNavigator<TournamentsStackParamList>();

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

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Tournaments: '🏆',
    Dashboard: '👤',
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'My Tournaments' }}
      />
    </Tab.Navigator>
  );
}
