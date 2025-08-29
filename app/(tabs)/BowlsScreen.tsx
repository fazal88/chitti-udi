import React, { useState } from 'react';
import { FlatList, Button, Text, Modal, TextInput, StyleSheet, View, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import uuid from 'react-native-uuid';

interface Bowl {
  id: string;
  name: string;
  ownerId: string;
  listMembers: string[];
  listEntries: string[];
}

const dummyBowls: Bowl[] = [
  { id: '1', name: 'Breakfast Bowl', ownerId: 'device-1', listMembers: ['Alice', 'Bob'], listEntries: ['Entry 1', 'Entry 2'] },
  { id: '2', name: 'Fruit Bowl', ownerId: 'device-2', listMembers: ['Charlie', 'Dana'], listEntries: ['Entry A', 'Entry B', 'Entry C'] },
  { id: '3', name: 'Salad Bowl', ownerId: 'device-3', listMembers: ['Eve'], listEntries: ['Entry X'] },
  { id: '4', name: 'Party Bowl', ownerId: 'device-4', listMembers: ['Frank', 'Grace', 'Heidi'], listEntries: ['Entry Y', 'Entry Z'] },
  { id: '5', name: 'Snack Bowl', ownerId: 'device-5', listMembers: ['Ivan', 'Judy'], listEntries: ['Entry Q', 'Entry W', 'Entry E'] },
  { id: '6', name: 'Dessert Bowl', ownerId: 'device-6', listMembers: ['Mallory', 'Oscar', 'Peggy', 'Sybil'], listEntries: ['Entry R'] },
];

export default function BowlsScreen() {
  const [bowls, setBowls] = useState<Bowl[]>(dummyBowls);
  const [modalVisible, setModalVisible] = useState(false);
  const deviceId = Device.modelId || 'unknown-device';
  const [newBowl, setNewBowl] = useState<Bowl>({ id: '', name: '', ownerId: deviceId, listMembers: [], listEntries: [] });

  const addBowl = () => {
    const bowlToAdd = {
      ...newBowl,
      id: uuid.v4() as string,
      ownerId: deviceId,
    };
    setBowls([...bowls, bowlToAdd]);
    setNewBowl({ id: '', name: '', ownerId: deviceId, listMembers: [], listEntries: [] });
    setModalVisible(false);
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
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>👤 Owner:</Text>
        <Text style={styles.cardSubtitle}>{item.ownerId}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members:</Text>
        <Text style={styles.countText}>{item.listMembers.length}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>📋 Entries:</Text>
        <Text style={styles.countText}>{item.listEntries.length}</Text>
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
      <View style={styles.addButtonWrapper}>
        <Button
          title="➕ Add Bowl"
          color="#7C3AED"
          onPress={() => setModalVisible(true)}
        />
      </View>
      <FlatList
        data={bowls}
        keyExtractor={(item) => item.id}
        renderItem={renderBowlItem}
        contentContainerStyle={{ paddingVertical: 16 }}
      />
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
            placeholder="Members (comma separated)"
            value={newBowl.listMembers.join(',')}
            onChangeText={(text) => setNewBowl({ ...newBowl, listMembers: text.split(',') })}
            style={styles.input}
          />
          <TextInput
            placeholder="Entries (comma separated)"
            value={newBowl.listEntries.join(',')}
            onChangeText={(text) => setNewBowl({ ...newBowl, listEntries: text.split(',') })}
            style={styles.input}
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
  addButtonWrapper: {
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ede9fe',
    elevation: 2,
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
});
