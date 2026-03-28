import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as api from '../lib/api';
import type { MonetizationBalance } from '../lib/types';
import { colors } from '../constants/theme';

interface PricingData {
  matchPrice: number;
  creditPacks: Array<{
    size: number;
    price: number;
    perMatch: number;
    discount: string;
  }>;
  ballerSubscription: {
    price: number;
    period: string;
    includes: string[];
  };
}

export function ShopScreen() {
  const [balance, setBalance] = useState<MonetizationBalance | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([
        api.getMonetizationBalance(),
        api.getPricing(),
      ]);
      setBalance(b);
      setPricing(p);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  async function handleBuyCredits(packSize: number) {
    setBuying(packSize);
    try {
      const { checkoutUrl } = await api.buyCredits(packSize);
      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        // Refresh balance after returning from checkout
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBuying(null);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const { checkoutUrl } = await api.subscribeBaller();
      if (checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
        fetchData();
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleCancelSubscription() {
    Alert.alert(
      'Cancel Subscription',
      'Your Baller benefits will continue until the end of the current billing period. Are you sure?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { periodEnd } = await api.cancelBallerSubscription();
              Alert.alert(
                'Subscription Cancelled',
                `Your benefits continue until ${new Date(periodEnd).toLocaleDateString()}.`,
              );
              fetchData();
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Cancellation failed');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isBaller = balance?.isBaller ?? false;
  const totalCredits = balance?.credits.total ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['bottom']}>
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Balance Card */}
        <View className="bg-primary/10 dark:bg-primary/20 rounded-2xl p-5 mt-4 mb-6">
          <Text className="text-sm font-medium text-muted dark:text-muted-dark mb-1">
            Your Balance
          </Text>
          <Text className="text-4xl font-bold text-primary dark:text-primary-dark">
            {totalCredits} {totalCredits === 1 ? 'credit' : 'credits'}
          </Text>
          {isBaller && (
            <View className="flex-row items-center mt-2">
              <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                BALLER — Unlimited competitive matches
              </Text>
            </View>
          )}
        </View>

        {/* Nudge */}
        {balance?.nudge && (
          <View className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-700">
            <Text className="text-sm text-amber-800 dark:text-amber-200">
              {balance.nudge.message}
            </Text>
          </View>
        )}

        {/* Baller Subscription */}
        {pricing && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-secondary dark:text-secondary-dark mb-3">
              Balling Baller
            </Text>
            <View className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl p-5 border-2 border-amber-300 dark:border-amber-600">
              <View className="flex-row items-baseline mb-3">
                <Text className="text-3xl font-bold text-secondary dark:text-secondary-dark">
                  {'\u20AC'}{pricing.ballerSubscription.price}
                </Text>
                <Text className="text-sm text-muted dark:text-muted-dark ml-1">
                  /{pricing.ballerSubscription.period}
                </Text>
              </View>
              {pricing.ballerSubscription.includes.map((perk) => (
                <View key={perk} className="flex-row items-center mb-1.5">
                  <Text className="text-green-600 dark:text-green-400 mr-2 text-sm">
                    {'\u2713'}
                  </Text>
                  <Text className="text-sm text-secondary dark:text-secondary-dark flex-1">
                    {perk}
                  </Text>
                </View>
              ))}
              {isBaller ? (
                <View className="mt-4">
                  {balance?.subscription?.cancelAtPeriodEnd ? (
                    <Text className="text-sm text-muted dark:text-muted-dark text-center">
                      Cancels {new Date(balance.subscription.currentPeriodEnd).toLocaleDateString()}
                    </Text>
                  ) : (
                    <Pressable
                      onPress={handleCancelSubscription}
                      className="border border-red-300 dark:border-red-600 rounded-xl py-3 items-center"
                    >
                      <Text className="text-red-600 dark:text-red-400 font-semibold text-sm">
                        Cancel Subscription
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={handleSubscribe}
                  disabled={subscribing}
                  className="bg-amber-500 dark:bg-amber-600 rounded-xl py-3.5 items-center mt-4"
                >
                  {subscribing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-base">
                      Subscribe to Baller
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Credit Packs */}
        {pricing && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-secondary dark:text-secondary-dark mb-1">
              Credit Packs
            </Text>
            <Text className="text-sm text-muted dark:text-muted-dark mb-3">
              Use credits for competitive matches ({'\u20AC'}{pricing.matchPrice}/match or save with packs)
            </Text>
            {pricing.creditPacks.map((pack) => (
              <View
                key={pack.size}
                className="bg-surface dark:bg-surface-dark rounded-2xl p-4 mb-3 border border-border dark:border-border-dark flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-bold text-secondary dark:text-secondary-dark">
                      {pack.size} Credits
                    </Text>
                    <View className="bg-green-100 dark:bg-green-900/40 rounded-full px-2 py-0.5 ml-2">
                      <Text className="text-xs font-semibold text-green-700 dark:text-green-400">
                        {pack.discount} OFF
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-muted dark:text-muted-dark">
                    {'\u20AC'}{pack.perMatch.toFixed(2)}/match
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleBuyCredits(pack.size)}
                  disabled={buying !== null}
                  className="bg-primary dark:bg-primary-dark rounded-xl px-5 py-3 items-center min-w-[90px]"
                >
                  {buying === pack.size ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      {'\u20AC'}{pack.price.toFixed(2)}
                    </Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Single Match Price */}
        {pricing && (
          <View className="bg-surface dark:bg-surface-dark rounded-2xl p-4 border border-border dark:border-border-dark mb-6">
            <Text className="text-sm text-muted dark:text-muted-dark text-center">
              Or pay per match: {'\u20AC'}{pricing.matchPrice.toFixed(2)} each
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
