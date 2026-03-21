import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { OnboardingSportScreen } from '../screens/onboarding/OnboardingSportScreen';
import { OnboardingSkillScreen } from '../screens/onboarding/OnboardingSkillScreen';
import { OnboardingCityScreen } from '../screens/onboarding/OnboardingCityScreen';
import { OnboardingAvatarScreen } from '../screens/onboarding/OnboardingAvatarScreen';

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingSport: undefined;
  OnboardingSkill: { sports: string[] };
  OnboardingCity: { sports: string[]; skillLevel: number };
  OnboardingAvatar: { sports: string[]; skillLevel: number; city?: string };
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingSport" component={OnboardingSportScreen} />
      <Stack.Screen name="OnboardingSkill" component={OnboardingSkillScreen} />
      <Stack.Screen name="OnboardingCity" component={OnboardingCityScreen} />
      <Stack.Screen name="OnboardingAvatar" component={OnboardingAvatarScreen} />
    </Stack.Navigator>
  );
}
