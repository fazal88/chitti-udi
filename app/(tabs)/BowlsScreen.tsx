import React, { useState, useEffect } from 'react';
import { FlatList, Button, Text, Modal, TextInput, StyleSheet, View, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import uuid from 'react-native-uuid';
import { firebaseConfig } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';

// Initialize Firebase app and database once
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const bowlsRef = ref(db, 'bowls');

interface Member {
  id: string;
  firebaseToken: string;
  name: string;
}

interface Bowl {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  listMembers: Member[];
  listEntries: string[];
  memberLimit: number;
  inputCount: number;
}

export default function BowlsScreen() {
  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedBowl, setSelectedBowl] = useState<Bowl | null>(null);
  const deviceId = Device.modelId || 'unknown-device';
  const [newBowl, setNewBowl] = useState<Bowl>({ id: '', name: '', description: '', ownerId: deviceId, listMembers: [], listEntries: [], memberLimit: 0, inputCount: 0 });

  // Simulate user info (replace with real auth/device info as needed)
  const user = {
    id: deviceId,
    firebaseToken: 'dummy-token', // Replace with real token if available
    name: 'Me', // Replace with real name if available
  };

  useEffect(() => {
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

  // Show entry modal and set selected bowl
  const openEntryModal = (bowl: Bowl) => {
    setSelectedBowl(bowl);
    setEntryText('');
    setEntryModalVisible(true);
  };

  // Add entry to bowl and update Firebase
  const handleAddEntry = async () => {
    if (!selectedBowl) return;
    try {
      setLoading(true);
      setError(null);
      // Add user to member list if not already present
      const alreadyMember = Array.isArray(selectedBowl.listMembers) && selectedBowl.listMembers.some(m => m.id === user.id);
      const updatedMembers = alreadyMember ? selectedBowl.listMembers : [...(Array.isArray(selectedBowl.listMembers) ? selectedBowl.listMembers : []), user];
      // Add new entry
      const updatedEntries = [...(Array.isArray(selectedBowl.listEntries) ? selectedBowl.listEntries : []), entryText];
      // Update bowl in Firebase
      const bowlRef = ref(db, `bowls/${selectedBowl.id}`);
      await set(bowlRef, {
        ...selectedBowl,
        listMembers: updatedMembers,
        listEntries: updatedEntries,
      });
      setEntryModalVisible(false);
      setLoading(false);
    } catch (err) {
      setError('Failed to add entry');
      setLoading(false);
    }
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
        <Text style={styles.countText}>{Array.isArray(item.listMembers) ? item.listMembers.length : 0}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members allowed:</Text>
        <Text style={styles.limitText}>{item.memberLimit}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>📋 Total entries:</Text>
        <Text style={styles.countText}>{Array.isArray(item.listEntries) ? item.listEntries.length : 0}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🔢 Entry allowed per user :</Text>
        <Text style={styles.countText}>
          {item.inputCount > 0 ? item.inputCount : 'no limit'}
        </Text>
      </View>
      <View style={styles.shareButtonRow}>
        <Button
          title="Add Entry"
          color="#10B981"
          onPress={() => openEntryModal(item)}
        />
        <View style={{ width: 8 }} />
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
      <Modal visible={entryModalVisible} animationType="slide" transparent>
        <View style={styles.entryModalOverlay}>
          <View style={styles.entryModalContent}>
            <Text style={styles.modalLabel}>Add Entry</Text>
            <TextInput
              placeholder="Enter your entry"
              value={entryText}
              onChangeText={setEntryText}
              style={styles.input}
            />
            <View style={styles.modalButtonRow}>
              <Button title="Submit" color="#10B981" onPress={handleAddEntry} disabled={!entryText.trim()} />
              <View style={{ width: 12 }} />
              <Button title="Cancel" color="#EF4444" onPress={() => setEntryModalVisible(false)} />
            </View>
          </View>
        </View>
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
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  limitText: {
    fontSize: 14,
    color: '#F59E42',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  entryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    elevation: 6,
  },
});
