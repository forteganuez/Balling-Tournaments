import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../lib/api';
import type { PaymentRecord } from '../lib/types';
import type { ProfileStackParamList } from '../navigation/types';
import { SportIcon } from '../components/SportIcon';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'PaymentHistory'>;

export function PaymentHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getPaymentHistory();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  function handleRefresh() {
    setRefreshing(true);
    fetchPayments();
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Pressable onPress={fetchPayments} className="bg-primary px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (payments.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-4xl mb-4">💳</Text>
          <Text className="text-lg font-semibold text-secondary mb-2">
            No payments yet
          </Text>
          <Text className="text-muted text-center">
            Your tournament payment history will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSpent = payments.reduce((sum, p) => sum + p.entryFee, 0);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-4 pt-4 pb-8">
          {/* Summary card */}
          <View className="bg-white rounded-xl p-4 mb-4 border border-border">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm text-muted">Total Spent</Text>
                <Text className="text-2xl font-bold text-secondary">
                  {totalSpent === 0 ? 'Free' : `€${(totalSpent / 100).toFixed(2)}`}
                </Text>
              </View>
              <View>
                <Text className="text-sm text-muted">Tournaments</Text>
                <Text className="text-2xl font-bold text-primary text-right">
                  {payments.length}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment list */}
          {payments.map((payment) => {
            const dateStr = new Date(payment.registeredAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const isPaid = payment.paidAt !== null;
            const isFree = payment.entryFee === 0;

            return (
              <Pressable
                key={payment.id}
                onPress={() =>
                  navigation.getParent()?.navigate('Tournaments', {
                    screen: 'TournamentDetail',
                    params: { id: payment.tournamentId },
                  })
                }
                className="bg-white rounded-xl p-4 mb-3 border border-border"
              >
                <View className="flex-row items-center mb-2">
                  <SportIcon sport={payment.sport} size={24} />
                  <Text className="text-base font-semibold text-secondary ml-2 flex-1" numberOfLines={1}>
                    {payment.tournamentName}
                  </Text>
                  <Text className="text-base font-bold text-primary">
                    {isFree ? 'Free' : `€${(payment.entryFee / 100).toFixed(2)}`}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted">{dateStr}</Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      isFree
                        ? 'bg-blue-100'
                        : isPaid
                          ? 'bg-green-100'
                          : 'bg-yellow-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isFree
                          ? 'text-blue-700'
                          : isPaid
                            ? 'text-green-700'
                            : 'text-yellow-700'
                      }`}
                    >
                      {isFree ? 'Free Entry' : isPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {payment.location && (
                  <Text className="text-xs text-muted mt-1">{payment.location}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
