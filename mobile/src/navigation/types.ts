import type { NavigatorScreenParams } from '@react-navigation/native';
import type { OnboardingStackParamList } from './OnboardingNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Tournaments: NavigatorScreenParams<TournamentsStackParamList>;
  Friends: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type TournamentsStackParamList = {
  TournamentList: undefined;
  TournamentDetail: { id: string };
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  PlayerProfile: { id: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
