import React from 'react';
import { View, Text, Image, ScrollView, FlatList } from 'react-native';
import type { Match } from '../lib/types';

interface VisualBracketProps {
  matches: Match[];
  format: 'SINGLE_ELIMINATION' | 'ROUND_ROBIN' | 'DOUBLE_ELIMINATION';
  currentUserId?: string;
  players?: Record<string, { name: string; avatarUrl?: string | null }>;
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function getPlayerName(
  playerId: string | null | undefined,
  players?: Record<string, { name: string; avatarUrl?: string | null }>,
): string {
  if (!playerId) return 'TBD';
  return players?.[playerId]?.name ?? 'Unknown';
}

function PlayerBadge({
  playerId,
  players,
}: {
  playerId: string | null | undefined;
  players?: Record<string, { name: string; avatarUrl?: string | null }>;
}) {
  const name = getPlayerName(playerId, players);
  const avatarUrl = playerId ? players?.[playerId]?.avatarUrl : null;
  const initial = name !== 'TBD' ? name.charAt(0).toUpperCase() : '?';

  return (
    <View className="flex-row items-center">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          className="rounded-full bg-gray-200"
          style={{ width: 36, height: 36 }}
        />
      ) : (
        <View
          className={`rounded-full items-center justify-center ${
            playerId ? 'bg-primary' : 'bg-gray-300'
          }`}
          style={{ width: 36, height: 36 }}
        >
          <Text className="text-white text-xs font-bold">{initial}</Text>
        </View>
      )}
      <Text className="ml-2 text-sm text-secondary dark:text-secondary-dark" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  SINGLE ELIMINATION bracket                                         */
/* ------------------------------------------------------------------ */

function groupByRound(matches: Match[]): { round: number; matches: Match[] }[] {
  const map: Record<number, Match[]> = {};
  for (const m of matches) {
    if (!map[m.round]) map[m.round] = [];
    map[m.round].push(m);
  }
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      matches: map[round].sort((a, b) => a.position - b.position),
    }));
}

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final';
  if (round === totalRounds - 1) return 'Semis';
  if (round === totalRounds - 2) return 'Quarters';
  return `Round ${round}`;
}

function SingleEliminationBracket({
  matches,
  currentUserId,
  players,
}: Omit<VisualBracketProps, 'format'>) {
  const rounds = groupByRound(matches);
  const totalRounds = rounds.length;

  if (rounds.length === 0) {
    return (
      <Text className="text-muted dark:text-muted-dark text-center py-4">No matches generated yet</Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row p-2">
        {rounds.map((roundData, roundIdx) => {
          const isLastRound = roundIdx === rounds.length - 1;

          return (
            <View key={roundData.round} className="flex-row">
              {/* Round column */}
              <View className="items-center" style={{ width: 180 }}>
                <Text className="text-xs font-semibold text-muted dark:text-muted-dark mb-3">
                  {getRoundLabel(roundData.round, totalRounds)}
                </Text>

                <View className="flex-1 justify-around">
                  {roundData.matches.map((match) => {
                    const isUserMatch =
                      currentUserId != null &&
                      (match.player1Id === currentUserId ||
                        match.player2Id === currentUserId);
                    const isCompleted = match.winnerId != null;
                    const bothEmpty =
                      match.player1Id == null && match.player2Id == null;

                    return (
                      <View key={match.id} className="mb-4 items-center">
                        <View
                          className={`rounded-lg p-3 bg-white dark:bg-card-dark border ${
                            isUserMatch ? 'border-primary border-2' : 'border-border dark:border-border-dark'
                          }`}
                          style={{ width: 164 }}
                        >
                          {bothEmpty ? (
                            <View className="items-center py-3">
                              <Text className="text-xs text-muted dark:text-muted-dark">
                                Awaiting players
                              </Text>
                            </View>
                          ) : (
                            <>
                              {/* Player 1 row */}
                              <View
                                className={`flex-row items-center pb-2 ${
                                  isCompleted && match.winnerId === match.player1Id
                                    ? 'border-l-2 border-green-500 pl-2'
                                    : 'pl-2'
                                }`}
                                style={{
                                  opacity:
                                    isCompleted &&
                                    match.winnerId !== match.player1Id
                                      ? 0.5
                                      : 1,
                                }}
                              >
                                <PlayerBadge
                                  playerId={match.player1Id}
                                  players={players}
                                />
                              </View>

                              {/* VS divider */}
                              <View className="border-t border-border dark:border-border-dark my-1" />
                              <Text className="text-center text-xs text-muted dark:text-muted-dark py-0.5">
                                VS
                              </Text>
                              <View className="border-t border-border dark:border-border-dark my-1" />

                              {/* Player 2 row */}
                              <View
                                className={`flex-row items-center pt-2 ${
                                  isCompleted && match.winnerId === match.player2Id
                                    ? 'border-l-2 border-green-500 pl-2'
                                    : 'pl-2'
                                }`}
                                style={{
                                  opacity:
                                    isCompleted &&
                                    match.winnerId !== match.player2Id
                                      ? 0.5
                                      : 1,
                                }}
                              >
                                <PlayerBadge
                                  playerId={match.player2Id}
                                  players={players}
                                />
                              </View>

                              {/* Score */}
                              {isCompleted && match.score != null && (
                                <View className="mt-2 pt-1 border-t border-border dark:border-border-dark items-center">
                                  <Text className="text-xs font-semibold text-secondary dark:text-secondary-dark">
                                    {match.score}
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Connector lines between rounds */}
              {!isLastRound && (
                <View
                  className="justify-around items-center"
                  style={{ width: 24 }}
                >
                  {roundData.matches.map((_, idx) => {
                    // Draw a connector for every pair of matches feeding the next round
                    if (idx % 2 !== 0) return null;
                    return (
                      <View key={idx} className="items-center justify-center my-2">
                        <View className="border-r border-border dark:border-border-dark" style={{ width: 12, height: 20 }} />
                        <View className="border-t border-border dark:border-border-dark" style={{ width: 24, height: 0 }} />
                        <View className="border-r border-border dark:border-border-dark" style={{ width: 12, height: 20 }} />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  ROUND ROBIN standings table                                        */
/* ------------------------------------------------------------------ */

interface StandingRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
}

function computeStandings(
  matches: Match[],
  players?: Record<string, { name: string; avatarUrl?: string | null }>,
): StandingRow[] {
  const stats: Record<string, { wins: number; losses: number }> = {};

  const ensurePlayer = (id: string) => {
    if (!stats[id]) stats[id] = { wins: 0, losses: 0 };
  };

  for (const m of matches) {
    if (m.player1Id) ensurePlayer(m.player1Id);
    if (m.player2Id) ensurePlayer(m.player2Id);

    if (m.winnerId) {
      ensurePlayer(m.winnerId);
      stats[m.winnerId].wins += 1;

      const loserId =
        m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      if (loserId) {
        ensurePlayer(loserId);
        stats[loserId].losses += 1;
      }
    }
  }

  return Object.entries(stats)
    .map(([id, s]) => ({
      playerId: id,
      name: players?.[id]?.name ?? 'Unknown',
      wins: s.wins,
      losses: s.losses,
      points: s.wins * 3,
    }))
    .sort((a, b) => b.points - a.points || a.losses - b.losses);
}

function RoundRobinStandings({
  matches,
  players,
}: Omit<VisualBracketProps, 'format' | 'currentUserId'>) {
  const standings = computeStandings(matches, players);

  if (standings.length === 0) {
    return (
      <Text className="text-muted dark:text-muted-dark text-center py-4">No standings available yet</Text>
    );
  }

  const renderHeader = () => (
    <View className="flex-row py-2 px-3 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark rounded-t-lg">
      <Text className="text-xs font-semibold text-muted dark:text-muted-dark" style={{ width: 28 }}>
        #
      </Text>
      <Text className="text-xs font-semibold text-muted dark:text-muted-dark flex-1">Player</Text>
      <Text
        className="text-xs font-semibold text-muted dark:text-muted-dark text-center"
        style={{ width: 36 }}
      >
        W
      </Text>
      <Text
        className="text-xs font-semibold text-muted dark:text-muted-dark text-center"
        style={{ width: 36 }}
      >
        L
      </Text>
      <Text
        className="text-xs font-semibold text-muted dark:text-muted-dark text-center"
        style={{ width: 40 }}
      >
        Pts
      </Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: StandingRow; index: number }) => (
    <View className="flex-row py-3 px-3 border-b border-border dark:border-border-dark bg-white dark:bg-card-dark items-center">
      <Text className="text-sm font-semibold text-secondary dark:text-secondary-dark" style={{ width: 28 }}>
        {index + 1}
      </Text>
      <Text className="text-sm text-secondary dark:text-secondary-dark flex-1" numberOfLines={1}>
        {item.name}
      </Text>
      <Text
        className="text-sm text-green-600 text-center font-medium"
        style={{ width: 36 }}
      >
        {item.wins}
      </Text>
      <Text
        className="text-sm text-accent text-center font-medium"
        style={{ width: 36 }}
      >
        {item.losses}
      </Text>
      <Text
        className="text-sm text-primary text-center font-bold"
        style={{ width: 40 }}
      >
        {item.points}
      </Text>
    </View>
  );

  return (
    <View className="rounded-lg overflow-hidden border border-border dark:border-border-dark">
      {renderHeader()}
      <FlatList
        data={standings}
        keyExtractor={(item) => item.playerId}
        renderItem={renderItem}
        scrollEnabled={false}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  DOUBLE ELIMINATION with Winners, Losers, and Grand Final           */
/* ------------------------------------------------------------------ */

function DoubleEliminationBracket({
  matches,
  currentUserId,
  players,
}: Omit<VisualBracketProps, 'format'>) {
  const winnersMatches = matches.filter((m) => m.bracket === 'WINNERS');
  const losersMatches = matches.filter((m) => m.bracket === 'LOSERS');
  const grandFinal = matches.filter((m) => m.bracket === 'GRAND_FINAL');

  // Fallback: if no bracket field, render as single elimination
  if (winnersMatches.length === 0 && losersMatches.length === 0) {
    return (
      <SingleEliminationBracket
        matches={matches}
        currentUserId={currentUserId}
        players={players}
      />
    );
  }

  return (
    <View>
      {/* Winners Bracket */}
      {winnersMatches.length > 0 && (
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-green-700">
                Winners Bracket
              </Text>
            </View>
          </View>
          <SingleEliminationBracket
            matches={winnersMatches}
            currentUserId={currentUserId}
            players={players}
          />
        </View>
      )}

      {/* Losers Bracket */}
      {losersMatches.length > 0 && (
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <View className="bg-red-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-red-700">
                Losers Bracket
              </Text>
            </View>
          </View>
          <SingleEliminationBracket
            matches={losersMatches}
            currentUserId={currentUserId}
            players={players}
          />
        </View>
      )}

      {/* Grand Final */}
      {grandFinal.length > 0 && (
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <View className="bg-purple-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-purple-700">
                Grand Final
              </Text>
            </View>
          </View>
          {grandFinal.map((match) => {
            const isUserMatch =
              currentUserId != null &&
              (match.player1Id === currentUserId ||
                match.player2Id === currentUserId);
            const isCompleted = match.winnerId != null;

            return (
              <View key={match.id} className="items-center">
                <View
                  className={`rounded-lg p-4 bg-white dark:bg-card-dark border-2 ${
                    isUserMatch ? 'border-primary' : 'border-purple-300'
                  }`}
                  style={{ width: 200 }}
                >
                  {match.player1Id == null && match.player2Id == null ? (
                    <View className="items-center py-3">
                      <Text className="text-xs text-muted dark:text-muted-dark">Awaiting finalists</Text>
                    </View>
                  ) : (
                    <>
                      <View
                        className={`flex-row items-center pb-2 ${
                          isCompleted && match.winnerId === match.player1Id
                            ? 'border-l-2 border-green-500 pl-2'
                            : 'pl-2'
                        }`}
                        style={{
                          opacity:
                            isCompleted && match.winnerId !== match.player1Id
                              ? 0.5
                              : 1,
                        }}
                      >
                        <PlayerBadge playerId={match.player1Id} players={players} />
                      </View>
                      <View className="border-t border-border dark:border-border-dark my-1" />
                      <Text className="text-center text-xs text-muted dark:text-muted-dark py-0.5">VS</Text>
                      <View className="border-t border-border dark:border-border-dark my-1" />
                      <View
                        className={`flex-row items-center pt-2 ${
                          isCompleted && match.winnerId === match.player2Id
                            ? 'border-l-2 border-green-500 pl-2'
                            : 'pl-2'
                        }`}
                        style={{
                          opacity:
                            isCompleted && match.winnerId !== match.player2Id
                              ? 0.5
                              : 1,
                        }}
                      >
                        <PlayerBadge playerId={match.player2Id} players={players} />
                      </View>
                      {isCompleted && match.score != null && (
                        <View className="mt-2 pt-1 border-t border-border dark:border-border-dark items-center">
                          <Text className="text-xs font-semibold text-secondary dark:text-secondary-dark">
                            {match.score}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function VisualBracket({
  matches,
  format,
  currentUserId,
  players,
}: VisualBracketProps) {
  if (matches.length === 0) {
    return (
      <Text className="text-muted dark:text-muted-dark text-center py-4">No matches yet</Text>
    );
  }

  switch (format) {
    case 'SINGLE_ELIMINATION':
      return (
        <SingleEliminationBracket
          matches={matches}
          currentUserId={currentUserId}
          players={players}
        />
      );
    case 'ROUND_ROBIN':
      return <RoundRobinStandings matches={matches} players={players} />;
    case 'DOUBLE_ELIMINATION':
      return (
        <DoubleEliminationBracket
          matches={matches}
          currentUserId={currentUserId}
          players={players}
        />
      );
    default:
      return (
        <Text className="text-muted dark:text-muted-dark text-center py-4">
          Unsupported bracket format
        </Text>
      );
  }
}
