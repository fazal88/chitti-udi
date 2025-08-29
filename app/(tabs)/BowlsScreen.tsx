import React, { useState, useEffect } from 'react';
import { FlatList, Button, Text, Modal, TextInput, StyleSheet, View, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import uuid from 'react-native-uuid';
import { firebaseConfig } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';

interface Bowl {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  listMembers: string[];
  listEntries: string[];
  memberLimit: number;
  inputCount: number;
}

const dummyBowls: Bowl[] = [
  { id: '1', name: 'Breakfast Bowl', description: 'Start your day with energy!', ownerId: 'device-1', listMembers: ['Alice', 'Bob'], listEntries: ['Entry 1', 'Entry 2'], memberLimit: 0, inputCount: 0 },
  { id: '2', name: 'Fruit Bowl', description: 'A healthy mix of fruits.', ownerId: 'device-2', listMembers: ['Charlie', 'Dana'], listEntries: ['Entry A', 'Entry B', 'Entry C'], memberLimit: 5, inputCount: 2 },
  { id: '3', name: 'Salad Bowl', description: 'Fresh greens and veggies.', ownerId: 'device-3', listMembers: ['Eve'], listEntries: ['Entry X'], memberLimit: 2, inputCount: 1 },
  { id: '4', name: 'Party Bowl', description: 'Perfect for sharing at parties.', ownerId: 'device-4', listMembers: ['Frank', 'Grace', 'Heidi'], listEntries: ['Entry Y', 'Entry Z'], memberLimit: 0, inputCount: 0 },
  { id: '5', name: 'Snack Bowl', description: 'Quick bites for any time.', ownerId: 'device-5', listMembers: ['Ivan', 'Judy'], listEntries: ['Entry Q', 'Entry W', 'Entry E'], memberLimit: 10, inputCount: 3 },
  { id: '6', name: 'Dessert Bowl', description: 'Sweet treats to end your meal.', ownerId: 'device-6', listMembers: ['Mallory', 'Oscar', 'Peggy', 'Sybil'], listEntries: ['Entry R'], memberLimit: 0, inputCount: 0 },
];

export default function BowlsScreen() {
  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const deviceId = Device.modelId || 'unknown-device';
  const [newBowl, setNewBowl] = useState<Bowl>({ id: '', name: '', description: '', ownerId: deviceId, listMembers: [], listEntries: [], memberLimit: 0, inputCount: 0 });

  // Initialize Firebase
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const bowlsRef = ref(db, 'bowls');
    const unsubscribe = onValue(bowlsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const bowlsList = Object.values(data) as Bowl[];
        setBowls(bowlsList);
      } else {
        setBowls([]);
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      setError('Failed to load bowls');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addBowl = async () => {
    try {
      setLoading(true);
      setError(null);
      const app = initializeApp(firebaseConfig);
      const db = getDatabase(app);
      const bowlsRef = ref(db, 'bowls');
      const newBowlRef = push(bowlsRef);
      const bowlToAdd = {
        ...newBowl,
        id: newBowlRef.key || uuid.v4(),
        ownerId: deviceId,
        memberLimit: Number(newBowl.memberLimit) || 0,
        inputCount: Number(newBowl.inputCount) || 0,
      };
      await set(newBowlRef, bowlToAdd);
      setNewBowl({ id: '', name: '', description: '', ownerId: deviceId, listMembers: [], listEntries: [], memberLimit: 0, inputCount: 0 });
      setModalVisible(false);
      setLoading(false);
    } catch (err) {
      setError('Failed to add bowl');
      setLoading(false);
    }
  };

  const handleShare = (bowlId: string) => {
    const url = `https://yourapp.com/bowl/${bowlId}`;
    Share.share({
      message: `Check out this bowl! ${url}`,
      url,
      title: 'Share Bowl',
    });
  };

  const renderBowlItem = ({ item }: { item: Bowl }) => (
    <View style={[styles.card, { borderLeftColor: '#7C3AED', borderLeftWidth: 6 }]}> 
      <View style={styles.cardHeader}>
        <Text style={styles.bowlEmoji}>🐟🥣</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>👤 Owner:</Text>
        <Text style={styles.cardSubtitle}>{item.ownerId}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members joined:</Text>
        <Text style={styles.countText}>{item.listMembers.length}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members allowed:</Text>
        <Text style={styles.limitText}>{item.memberLimit}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>📋 Total entries:</Text>
        <Text style={styles.countText}>{item.listEntries.length}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🔢 Entry allowed per user :</Text>
        <Text style={styles.countText}>
          {item.inputCount > 0 ? item.inputCount : 'no limit'}
        </Text>
      </View>
      <View style={styles.shareButtonRow}>
        <Button
          title="Share"
          color="#2563EB"
          onPress={() => handleShare(item.id)}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Chitti Udi</Text>
      <View style={styles.addButtonWrapper}>
        <Button
          title="Add Bowl"
          color="#7b37ef"
          onPress={() => setModalVisible(true)}
        />
      </View>
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading bowls...</Text>
      ) : error ? (
        <Text style={{ textAlign: 'center', color: 'red', marginTop: 20 }}>{error}</Text>
      ) : (
        <FlatList
          data={bowls}
          keyExtractor={(item) => item.id}
          renderItem={renderBowlItem}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      )}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContent}>
          {/* ID and OwnerID fields removed from input, as they are auto-generated */}
          <Text style={styles.modalLabel}>Owner ID: {deviceId}</Text>
          <TextInput
            placeholder="Bowl Name"
            value={newBowl.name}
            onChangeText={(text) => setNewBowl({ ...newBowl, name: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Description"
            value={newBowl.description}
            onChangeText={(text) => setNewBowl({ ...newBowl, description: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Member Limit (0 means No Limit)"
            value={newBowl.memberLimit === 0 ? '' : newBowl.memberLimit.toString()}
            onChangeText={(text) => setNewBowl({ ...newBowl, memberLimit: Number(text) })}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Input Count (0 means No Limit)"
            value={newBowl.inputCount === 0 ? '' : newBowl.inputCount.toString()}
            onChangeText={(text) => setNewBowl({ ...newBowl, inputCount: Number(text) })}
            style={styles.input}
            keyboardType="numeric"
          />
          <View style={styles.modalButtonRow}>
            <Button title="Add" color="#10B981" onPress={addBowl} />
            <View style={{ width: 12 }} />
            <Button title="Cancel" color="#EF4444" onPress={() => setModalVisible(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f7f7' },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 8,
    letterSpacing: 1.2,
  },
  addButtonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#7C3AED',
    elevation: 0,
    height: 60,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderLeftColor: '#7C3AED',
    borderLeftWidth: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bowlEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#7C3AED' },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  iconText: { fontSize: 16, marginRight: 8 },
  cardSubtitle: { fontSize: 15, color: '#444', fontWeight: '500' },
  countText: { fontSize: 16, color: '#10B981', fontWeight: 'bold', marginLeft: 4 },
  cardSection: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  modalContent: { flex: 1, justifyContent: 'center', padding: 16 },
  modalLabel: { fontSize: 15, color: '#7C3AED', marginBottom: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 12, padding: 8, borderRadius: 4 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  shareButtonRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  limitText: {
    fontSize: 14,
    color: '#F59E42',
    marginLeft: 6,
    fontWeight: 'bold',
  },
});
