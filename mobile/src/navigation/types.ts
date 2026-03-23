import type { NavigatorScreenParams } from '@react-navigation/native';
import type { OnboardingStackParamList } from './OnboardingNavigator';
import type { SubmitResultParams } from '../screens/SubmitResultScreen';

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
  Home: NavigatorScreenParams<HomeStackParamList>;
  Tournaments: NavigatorScreenParams<TournamentsStackParamList>;
  Friends: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  HostMatch: {
    scheduledDate?: string;
    scheduledTime?: string;
  } | undefined;
  MatchSchedule: {
    scheduledDate?: string;
    scheduledTime?: string;
  } | undefined;
};

export type TournamentsStackParamList = {
  TournamentList: undefined;
  TournamentDetail: { id: string };
  TournamentChat: { tournamentId: string; organizerId: string };
  SpectatorBracket: { id: string };
  SubmitResult: SubmitResultParams;
  CreateTournament: { id?: string } | undefined;
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  EditProfile: undefined;
  PlayerProfile: { id: string };
  Settings: undefined;
  AdminUsers: undefined;
  PaymentHistory: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
