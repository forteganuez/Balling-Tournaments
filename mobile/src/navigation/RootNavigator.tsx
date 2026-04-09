import React from 'react';
import type { LinkingOptions } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { AppNavigator } from './AppNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ChooseUsernameScreen } from '../screens/ChooseUsernameScreen';
import type { RootStackParamList, AuthStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  const { theme } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['balling://', 'https://balling.app'],
  config: {
    screens: {
      App: {
        screens: {
          Tournaments: {
            screens: {
              TournamentList: 'tournaments',
              TournamentDetail: 'tournament/:id',
              SpectatorBracket: 'tournament/:id/bracket',
            },
          },
          Profile: {
            screens: {
              PlayerProfile: 'player/:id',
              PaymentHistory: 'payments',
            },
          },
          Home: {
            screens: {
              HomeMain: '',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          // auth/callback is the OAuth redirect target (Google, Apple).
          // WebBrowser.openAuthSessionAsync captures it before it deep-links
          // into the app, but this entry ensures that on Android (where the
          // external browser may not be intercepted) the redirect still lands
          // correctly and triggers the onAuthStateChange SIGNED_IN event.
          AuthCallback: 'auth/callback',
        },
      },
    },
  },
};

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      {!user ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : !user.username ? (
        <RootStack.Screen name="ChooseUsername" component={ChooseUsernameScreen} />
      ) : !user.onboardingDone ? (
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <RootStack.Screen name="App" component={AppNavigator} />
      )}
    </RootStack.Navigator>
  );
}
