import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function BowlDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const processBowlLink = async () => {
      try {
        if (!id) {
          setStatus('Invalid bowl link');
          setTimeout(() => router.replace('/(tabs)'), 2000);
          return;
        }

        // Check if user has a username
        const userName = await SecureStore.getItemAsync('userName');
        
        if (userName) {
          // User has a username, redirect to main app with bowl ID
          // The BowlsScreen will handle the deep link processing
          setStatus('Processing bowl link...');
          router.replace({
            pathname: '/(tabs)',
            params: { bowlId: id }
          });
        } else {
          // User doesn't have a username, store bowl ID and redirect to username screen
          await SecureStore.setItemAsync('pendingBowlId', id);
          setStatus('Please set your name first...');
          router.replace('/UsernameScreen');
        }
      } catch (error) {
        console.error('Error processing bowl link:', error);
        setStatus('Error processing link');
        setTimeout(() => router.replace('/(tabs)'), 2000);
      }
    };

    processBowlLink();
  }, [id, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={styles.statusText}>{status}</Text>
      <Text style={styles.subText}>
        {id ? `Bowl ID: ${id}` : 'Processing bowl link...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});