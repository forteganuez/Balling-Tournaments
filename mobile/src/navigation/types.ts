import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  App: NavigatorScreenParams<AppTabParamList>;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Tournaments: NavigatorScreenParams<TournamentsStackParamList>;
  Dashboard: undefined;
};

export type TournamentsStackParamList = {
  TournamentList: undefined;
  TournamentDetail: { id: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
