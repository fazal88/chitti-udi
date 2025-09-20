import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, push, ref, set } from 'firebase/database';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import uuid from 'react-native-uuid';
import { firebaseConfig } from '../firebaseConfig';

// Initialize Firebase app and database once
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const bowlsRef = ref(db, 'bowls');

interface Member {
  id: string;
  name: string;
}

interface Entry {
  id: string;
  text: string;
  userId: string;
  userName: string;
}

enum BowlType {
  PICK_ONE_DISCARD = 'pick_one_discard',
  PICK_ONE_KEEP = 'pick_one_keep',
  SHUFFLE_MEMBERS = 'shuffle_members',
  MAKE_PAIRS = 'make_pairs',
  SECRET_SANTA = 'secret_santa',
  SHUFFLE_ENTRIES = 'shuffle_entries'
}

interface Bowl {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  listMembers: Member[];
  listEntries: Entry[];
  memberLimit: number;
  inputCount: number;
  type: BowlType;
  output?: string;
}

export default function BowlsScreen() {
  const { bowlId } = useLocalSearchParams<{ bowlId?: string }>();
  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [entriesModalVisible, setEntriesModalVisible] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedBowl, setSelectedBowl] = useState<Bowl | null>(null);
  const [deviceId, setDeviceId] = useState<string>('unknown-device');
  const [userName, setUserName] = useState('');
  const [pendingDeepLinkBowlId, setPendingDeepLinkBowlId] = useState<string | null>(null);
  const [newBowl, setNewBowl] = useState<Bowl>({
    id: '',
    name: '',
    description: '',
    ownerId: deviceId,
    ownerName: userName,
    listMembers: [],
    listEntries: [],
    memberLimit: 0,
    inputCount: 0,
    type: BowlType.PICK_ONE_DISCARD,
    output: '',
  });
  const [success, setSuccess] = useState<string | null>(null); // For success feedback
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(bowlsRef, async (snapshot) => {
      const data = snapshot.val();
      let bowlsList: Bowl[] = [];
      if (data) {
        bowlsList = Object.values(data) as Bowl[];
        // Filter bowls whose id is present in localstorage
        const myBowls = await SecureStore.getItemAsync('listMyBowls');
        let myBowlsArr: string[] = [];
        if (myBowls) {
          try {
            myBowlsArr = JSON.parse(myBowls);
          } catch {
            myBowlsArr = [];
          }
        }
        bowlsList = bowlsList.filter(bowl => myBowlsArr.includes(bowl.id));
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

  // Load user name from SecureStore
  useEffect(() => {
    async function loadUserName() {
      const name = await SecureStore.getItemAsync('userName');
      if (name) setUserName(name);
    }
    loadUserName();
  }, []);

  // Save user name to SecureStore
  const saveUserName = async (name: string) => {
    setUserName(name);
    await SecureStore.setItemAsync('userName', name);
  };

  // Simulate user info (replace with real auth/device info as needed)
  const [user, setUser] = useState({
    id: deviceId,
    name: userName,
  });

  // Generate and persist unique device ID on first launch
  useEffect(() => {
    async function getOrCreateDeviceId() {
      let id = await SecureStore.getItemAsync('deviceId');
      if (!id) {
        id = uuid.v4().toString();
        await SecureStore.setItemAsync('deviceId', id);
      }
      setDeviceId(id);
    }
    getOrCreateDeviceId();
  }, []);

  // When deviceId changes, update newBowl and user
  useEffect(() => {
    setNewBowl((prev) => ({ ...prev, ownerId: deviceId }));
    setUser((prev) => ({ ...prev, id: deviceId }));
  }, [deviceId]);

  // When userName changes, update newBowl ownerName
  useEffect(() => {
    setNewBowl((prev) => ({ ...prev, ownerName: userName }));
  }, [userName]);

  const addBowl = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!userName) return; // Prevent bowl creation if name is empty
      const newBowlRef = push(bowlsRef);
      const bowlToAdd = {
        ...newBowl,
        id: newBowlRef.key || uuid.v4(),
        ownerId: deviceId,
        ownerName: userName,
        memberLimit: Number(newBowl.memberLimit) || 0,
        inputCount: Number(newBowl.inputCount) || 0,
      };
      await set(newBowlRef, bowlToAdd);

      // Save bowl id to local storage as listMyBowls
      let myBowls = await SecureStore.getItemAsync('listMyBowls');
      let myBowlsArr: string[] = [];
      if (myBowls) {
        try {
          myBowlsArr = JSON.parse(myBowls);
        } catch {
          myBowlsArr = [];
        }
      }
      if (bowlToAdd.id && !myBowlsArr.includes(bowlToAdd.id)) {
        myBowlsArr.push(bowlToAdd.id);
        await SecureStore.setItemAsync('listMyBowls', JSON.stringify(myBowlsArr));
      }

      setNewBowl({ id: '', name: '', description: '', ownerId: deviceId, ownerName: userName, listMembers: [], listEntries: [], memberLimit: 0, inputCount: 0, type: BowlType.PICK_ONE_DISCARD });
      setModalVisible(false);
      setLoading(false);
    } catch {
      setError('Failed to add bowl');
      setLoading(false);
    }
  };

  // Type-specific shuffle logic for different bowl types
  const handleJuggle = async (bowl: Bowl) => {
    // Check permissions first
    const canShuffle = bowl.type === BowlType.PICK_ONE_DISCARD || bowl.type === BowlType.PICK_ONE_KEEP 
      ? true // Any member can shuffle for these types
      : bowl.ownerId === user.id; // Only owner can shuffle for other types

    if (!canShuffle) {
      setError('Only the bowl owner can perform this action.');
      return;
    }

    let result = '';
    
    switch (bowl.type) {
      case BowlType.PICK_ONE_DISCARD:
        if (!Array.isArray(bowl.listEntries) || bowl.listEntries.length === 0) {
          setError('No entries to shuffle!');
          return;
        }
        const randomIndex = Math.floor(Math.random() * bowl.listEntries.length);
        const selectedEntry = bowl.listEntries[randomIndex];
        result = selectedEntry.text;
        // Remove the selected entry from the list
        const updatedEntries = bowl.listEntries.filter((_, index) => index !== randomIndex);
        await updateBowlInFirebase(bowl.id, { ...bowl, listEntries: updatedEntries, output: result });
        break;

      case BowlType.PICK_ONE_KEEP:
        if (!Array.isArray(bowl.listEntries) || bowl.listEntries.length === 0) {
          setError('No entries to shuffle!');
          return;
        }
        const randomIndex2 = Math.floor(Math.random() * bowl.listEntries.length);
        result = bowl.listEntries[randomIndex2].text;
        await updateBowlInFirebase(bowl.id, { ...bowl, output: result });
        break;

      case BowlType.SHUFFLE_MEMBERS:
        if (!Array.isArray(bowl.listMembers) || bowl.listMembers.length === 0) {
          setError('No members to shuffle!');
          return;
        }
        const shuffledMembers = [...bowl.listMembers].sort(() => Math.random() - 0.5);
        result = shuffledMembers.map((member, index) => `${index + 1}. ${member.name}`).join('\n');
        await updateBowlInFirebase(bowl.id, { ...bowl, output: result });
        break;

      case BowlType.MAKE_PAIRS:
        if (!Array.isArray(bowl.listMembers) || bowl.listMembers.length < 2) {
          setError('Need at least 2 members to make pairs!');
          return;
        }
        const shuffledForPairs = [...bowl.listMembers].sort(() => Math.random() - 0.5);
        const pairs = [];
        for (let i = 0; i < shuffledForPairs.length; i += 2) {
          if (i + 1 < shuffledForPairs.length) {
            pairs.push(`${shuffledForPairs[i].name} & ${shuffledForPairs[i + 1].name}`);
          } else {
            pairs.push(`${shuffledForPairs[i].name} (Solo)`);
          }
        }
        result = pairs.map((pair, index) => `Pair ${index + 1}: ${pair}`).join('\n');
        await updateBowlInFirebase(bowl.id, { ...bowl, output: result });
        break;

      case BowlType.SECRET_SANTA:
        if (!Array.isArray(bowl.listMembers) || bowl.listMembers.length < 2) {
          setError('Need at least 2 members for Secret Santa!');
          return;
        }
        const members = [...bowl.listMembers];
        const shuffled = [...members].sort(() => Math.random() - 0.5);
        const assignments = members.map((giver, index) => {
          const receiverIndex = (index + 1) % members.length;
          return `${giver.name} → ${shuffled[receiverIndex].name}`;
        });
        result = 'Secret Santa Assignments:\n' + assignments.join('\n');
        await updateBowlInFirebase(bowl.id, { ...bowl, output: result });
        break;

      case BowlType.SHUFFLE_ENTRIES:
        if (!Array.isArray(bowl.listEntries) || bowl.listEntries.length === 0) {
          setError('No entries to shuffle!');
          return;
        }
        const shuffledEntries = [...bowl.listEntries].sort(() => Math.random() - 0.5);
        result = shuffledEntries.map((entry, index) => `${index + 1}. ${entry.text}`).join('\n');
        await updateBowlInFirebase(bowl.id, { ...bowl, output: result });
        break;

      default:
        setError('Unknown bowl type');
        return;
    }
  };

  // Helper function to update bowl in Firebase
  const updateBowlInFirebase = async (bowlId: string, updatedBowl: Bowl) => {
    const bowlRef = ref(db, `bowls/${bowlId}`);
    await set(bowlRef, updatedBowl);
  };

  // Helper function to get shuffle button text based on bowl type
  const getShuffleButtonText = (type: BowlType): string => {
    switch (type) {
      case BowlType.PICK_ONE_DISCARD:
        return 'Pick & Remove';
      case BowlType.PICK_ONE_KEEP:
        return 'Pick One';
      case BowlType.SHUFFLE_MEMBERS:
        return 'Shuffle Members';
      case BowlType.MAKE_PAIRS:
        return 'Make Pairs';
      case BowlType.SECRET_SANTA:
        return 'Assign Santa';
      case BowlType.SHUFFLE_ENTRIES:
        return 'Shuffle Entries';
      default:
        return 'Shuffle';
    }
  };

  // Helper function to check if user can shuffle
  const canUserShuffle = (bowl: Bowl): boolean => {
    return bowl.type === BowlType.PICK_ONE_DISCARD || bowl.type === BowlType.PICK_ONE_KEEP 
      ? true // Any member can shuffle for these types
      : bowl.ownerId === user.id; // Only owner can shuffle for other types
  };

  // Delete individual entry (owner only)
  const handleDeleteEntry = async (bowl: Bowl, entryId: string) => {
    // Only allow bowl owner to delete entries
    if (bowl.ownerId !== user.id) {
      Alert.alert(
        'Access Denied',
        'Only the bowl owner can delete entries.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);
              
              // Filter out the entry to delete
              const updatedEntries = Array.isArray(bowl.listEntries) 
                ? bowl.listEntries.filter(entry => entry.id !== entryId)
                : [];
              
              const updatedBowl = {
                ...bowl,
                listEntries: updatedEntries,
              };
              
              // Update bowl in Firebase
              const bowlRef = ref(db, `bowls/${bowl.id}`);
              await set(bowlRef, updatedBowl);
              
              // Update local state to reflect the change immediately
              setSelectedBowl(updatedBowl);
              
              // Also update the bowls list to keep everything in sync
              setBowls(prevBowls => 
                prevBowls.map(b => b.id === bowl.id ? updatedBowl : b)
              );
              
              setLoading(false);
            } catch {
              setError('Failed to delete entry');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleShare = (bowlId: string) => {
    const url = `https://chitti-udi.com/bowl/${bowlId}`;
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

  // Show members modal
  const openMembersModal = (bowl: Bowl) => {
    setSelectedBowl(bowl);
    setMembersModalVisible(true);
  };

  // Show entries modal
  const openEntriesModal = (bowl: Bowl) => {
    // Only allow bowl owner to view entries
    if (bowl.ownerId !== user.id) {
      Alert.alert(
        'Access Denied',
        'Only the bowl owner can view all entries.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    setSelectedBowl(bowl);
    setEntriesModalVisible(true);
  };

  // Add entry to bowl and update Firebase
  const handleAddEntry = async () => {
    if (!selectedBowl) return;
    try {
      setLoading(true);
      setError(null);
      if (!userName) return; // Prevent entry if name is empty
      user.name = userName;

      // Add user to member list if not already present
      const alreadyMember = Array.isArray(selectedBowl.listMembers) && selectedBowl.listMembers.some(m => m.id === user.id);
      const updatedMembers = alreadyMember ? selectedBowl.listMembers : [...(Array.isArray(selectedBowl.listMembers) ? selectedBowl.listMembers : []), user];

      // Check input count limit per user if it's set (but not for bowl owners)
      const entries = Array.isArray(selectedBowl.listEntries) ? selectedBowl.listEntries : [];
      const userEntryCount = entries.filter(entry => entry.userId === user.id).length;
      const isOwner = selectedBowl.ownerId === user.id;
      
      if (!isOwner && selectedBowl.inputCount > 0 && userEntryCount >= selectedBowl.inputCount) {
        Alert.alert(
          'Entry Limit Reached',
          `You have already added your maximum allowed entries (${selectedBowl.inputCount}). You cannot add more entries to this bowl.`,
          [{ text: 'OK', style: 'default' }]
        );
        setLoading(false);
        return;
      }

      // Prevent duplicate entry text
      if (entries.some(entry => entry.text === entryText.trim())) {
        setError('Duplicate entry not allowed.');
        setLoading(false);
        return;
      }

      // Create new entry object
      const newEntry: Entry = {
        id: uuid.v4().toString(),
        text: entryText.trim(),
        userId: user.id,
        userName: user.name,
      };

      // Add new entry
      const updatedEntries = [...entries, newEntry];

      // Update bowl in Firebase
      const bowlRef = ref(db, `bowls/${selectedBowl.id}`);
      await set(bowlRef, {
        ...selectedBowl,
        listMembers: updatedMembers,
        listEntries: updatedEntries,
      });
      setEntryModalVisible(false);
      setLoading(false);
    } catch {
      setError('Failed to add entry');
      setLoading(false);
    }
  };

  const handleDeleteBowl = async (bowlId: string) => {
    try {
      setLoading(true);
      setError(null);
      const bowlRef = ref(db, `bowls/${bowlId}`);
      await set(bowlRef, null); // Remove bowl from Firebase
      setLoading(false);
    } catch {
      setError('Failed to delete bowl');
      setLoading(false);
    }
  };

  // Clear all entries from a bowl (owner only)
  const handleClearEntries = async (bowl: Bowl) => {
    // Only allow bowl owner to clear entries
    if (bowl.ownerId !== user.id) {
      Alert.alert(
        'Access Denied',
        'Only the bowl owner can clear entries.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Clear All Entries',
      'Are you sure you want to clear all entries? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);
              
              // Update bowl in Firebase with empty entries list
              const bowlRef = ref(db, `bowls/${bowl.id}`);
              await set(bowlRef, {
                ...bowl,
                listEntries: [],
                output: "", // Also clear any juggle result
              });
              
              setLoading(false);
              Alert.alert('Success', 'All entries have been cleared.');
            } catch {
              setError('Failed to clear entries');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Function to join a bowl from deep link
  const joinBowlFromDeepLink = useCallback(async (bowlId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if bowl already exists in user's list
      let myBowls = await SecureStore.getItemAsync('listMyBowls');
      let myBowlsArr: string[] = [];
      if (myBowls) {
        try {
          myBowlsArr = JSON.parse(myBowls);
        } catch {
          myBowlsArr = [];
        }
      }
      
      const bowlAlreadyExists = myBowlsArr.includes(bowlId);

      // Fetch bowl data from Firebase
      const bowlRef = ref(db, `bowls/${bowlId}`);
      const snapshot = await new Promise<any>((resolve) => {
        onValue(bowlRef, resolve, { onlyOnce: true });
      });
      
      const bowlData = snapshot.val();
      if (!bowlData) {
        setError('Bowl not found. The link might be invalid or the bowl may have been deleted.');
        setLoading(false);
        return;
      }

      // Add bowl to user's list only if it doesn't exist
      if (!bowlAlreadyExists) {
        myBowlsArr.push(bowlId);
        await SecureStore.setItemAsync('listMyBowls', JSON.stringify(myBowlsArr));
      }

      // Only show entry modal if bowl is newly added
      if (!bowlAlreadyExists) {
        setSelectedBowl(bowlData);
        // setEntryText('');
        // setEntryModalVisible(true);
        // setSuccess(`Successfully joined "${bowlData.name}"! Add your entry below.`);
      } else {
        // setSuccess(`You're already part of "${bowlData.name}" bowl.`);
      }
      
      setLoading(false);
      // Refresh bowls list to show the new bowl
      refreshBowls();
    } catch {
      setError('Failed to join bowl. Please check your connection and try again.');
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedBowl]);

  // Function to manually refresh bowls list
  const refreshBowls = async () => {
    setRefreshing(true);
    const snapshot = await new Promise<any>((resolve) => {
      onValue(bowlsRef, resolve, { onlyOnce: true });
    });
    const data = snapshot.val();
    let bowlsList: Bowl[] = [];
    if (data) {
      bowlsList = Object.values(data) as Bowl[];
      const myBowls = await SecureStore.getItemAsync('listMyBowls');
      let myBowlsArr: string[] = [];
      if (myBowls) {
        try {
          myBowlsArr = JSON.parse(myBowls);
        } catch {
          myBowlsArr = [];
        }
      }
      bowlsList = bowlsList.filter(bowl => myBowlsArr.includes(bowl.id));
      setBowls(bowlsList);
    } else {
      setBowls([]);
    }
    setRefreshing(false);
  };

  const renderBowlItem = ({ item }: { item: Bowl }) => (
    <View style={[styles.card, { borderLeftColor: '#7C3AED', borderLeftWidth: 6 }]}> 
      <View style={styles.cardHeader}>
        <Text style={styles.bowlEmoji}>⏳</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
        {/* Show delete icon only if ownerId matches deviceId */}
        {item.ownerId === deviceId && (
          <TouchableOpacity
            style={{ marginLeft: 8, backgroundColor: '#F87171', borderRadius: 20, padding: 4 }}
            onPress={() => Alert.alert('Delete Bowl', 'Are you sure you want to delete this bowl?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => handleDeleteBowl(item.id) },
            ])}
          >
            <Ionicons name="trash" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.cardRow, {width:'70%'}]}>
        <Text style={styles.iconText}>👤 Owner:</Text>
        <Text style={[styles.cardSubtitle]} numberOfLines={1} ellipsizeMode='tail'>{item.ownerName || item.ownerId}</Text>
      </View>
      <TouchableOpacity style={styles.cardRow} onPress={() => openMembersModal(item)}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members joined:</Text>
        <Text style={styles.countText}>{Array.isArray(item.listMembers) ? item.listMembers.length : 0}</Text>
        <Ionicons name="eye" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🧑‍🤝‍🧑 Members allowed:</Text>
        <Text style={styles.limitText}>{item.memberLimit}</Text>
      </View>
      {/* Only show entries view button for bowl owner */}
      {item.ownerId === user.id ? (
        <TouchableOpacity style={styles.cardRow} onPress={() => openEntriesModal(item)}>
          <Text style={styles.iconText}>📋 Total entries:</Text>
          <Text style={styles.countText}>{Array.isArray(item.listEntries) ? item.listEntries.length : 0}</Text>
          <Ionicons name="eye" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      ) : (
        <View style={styles.cardRow}>
          <Text style={styles.iconText}>📋 Total entries:</Text>
          <Text style={styles.countText}>{Array.isArray(item.listEntries) ? item.listEntries.length : 0}</Text>
          <Ionicons name="lock-closed" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
        </View>
      )}
      <View style={styles.cardRow}>
        <Text style={styles.iconText}>🔢 Entry allowed per user :</Text>
        <Text style={styles.countText}>
          {item.inputCount > 0 ? item.inputCount : 'no limit'}
        </Text>
      </View>
      {/* Show juggle result if available */}
      {item.output && (
        <View style={styles.cardRow}>
          <Text style={styles.iconText}>🎲 Result:</Text>
          <Text style={styles.countText}>{item.output}</Text>
        </View>
      )}
      <View style={styles.shareButtonRow}>
        {/* Show juggle button only if ownerId matches deviceId */}
        {canUserShuffle(item) && (
          <TouchableOpacity style={styles.iconButton} onPress={() => handleJuggle(item)}>
            <Ionicons name="shuffle" size={22} color="#ff0d00" />
            <Text style={styles.iconButtonText}>Shuffle</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconButton} onPress={() => openEntryModal(item)}>
          <Ionicons name="add-circle" size={22} color="#10B981" />
          <Text style={styles.iconButtonText}>Add Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton,{backgroundColor:'transparent'}]} onPress={() => handleShare(item.id)}>
          <Ionicons name="share-social" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const handleDeepLink = async (event: Linking.EventType) => {
      const url = event.url ?? '';
      const match = url.match(/bowl\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const bowlId = match[1];
        
        // Check if user has a username
        if (userName && userName.trim()) {
          // User has username, process immediately
          await joinBowlFromDeepLink(bowlId);
        } else {
          // User doesn't have username yet, store for later
          setPendingDeepLinkBowlId(bowlId);
          setError('Please set your name first, then we\'ll add you to the bowl!');
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    })();

    return () => {
      subscription.remove();
    };
  }, [userName, joinBowlFromDeepLink]);

  // Handle pending deep link when username becomes available
  useEffect(() => {
    if (userName && userName.trim() && pendingDeepLinkBowlId) {
      // User now has username and there's a pending deep link
      joinBowlFromDeepLink(pendingDeepLinkBowlId);
      setPendingDeepLinkBowlId(null); // Clear the pending bowl ID
    }
  }, [userName, pendingDeepLinkBowlId, joinBowlFromDeepLink]);

  // Handle bowl ID parameter from navigation (from deep link routing)
  useEffect(() => {
    if (bowlId && userName && userName.trim()) {
      // Bowl ID passed from navigation and user has username
      joinBowlFromDeepLink(bowlId);
    }
  }, [bowlId, userName, joinBowlFromDeepLink]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Chitti Udi</Text>
      <Text style={styles.headerSubtitle}>Create, join, and juggle bowls with friends!</Text>
      <View style={[styles.addButtonWrapper, { width: '100%', marginBottom: 8 }]}>
        <TouchableOpacity
          style={[styles.fabButton, { width: '100%', justifyContent: 'center' }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
          <Text style={styles.fabButtonText}>Add Bowl</Text>
        </TouchableOpacity>
      </View>
      {/* Show loading, error, or success messages */}
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading bowls...</Text>
      ) : error ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text>
          <Button title="Dismiss" color="#EF4444" onPress={() => setError(null)} />
        </View>
      ) : success ? (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: '#10B981', marginBottom: 8 }}>{success}</Text>
          <Button title="OK" color="#10B981" onPress={() => setSuccess(null)} />
        </View>
      ) : (
        <FlatList
          data={bowls}
          keyExtractor={(item) => item.id}
          renderItem={renderBowlItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshing={refreshing}
          onRefresh={refreshBowls}
        />
      )}
      {/* Modal for adding a new bowl */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContent}>
          <Text style={styles.modalLabel}>Add Details</Text>
          <Text style={styles.helperText}>Your name will be visible to other bowl members.</Text>
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
          
          {/* Bowl Type Selection */}
          <Text style={styles.sectionLabel}>Bowl Type</Text>
          <ScrollView style={styles.typeSelection} showsVerticalScrollIndicator={false}>
            {[
              { type: BowlType.PICK_ONE_DISCARD, title: 'Pick One & Discard', description: 'Pick one entry and discard it from results (Members can shuffle)' },
              { type: BowlType.PICK_ONE_KEEP, title: 'Pick One & Keep', description: 'Pick one entry but keep all entries visible (Members can shuffle)' },
              { type: BowlType.SHUFFLE_MEMBERS, title: 'Shuffle Members', description: 'Shuffle and show list of member names (Owner only)' },
              { type: BowlType.MAKE_PAIRS, title: 'Make Pairs', description: 'Shuffle members and create pairs (Owner only)' },
              { type: BowlType.SECRET_SANTA, title: 'Secret Santa', description: 'Assign secret santa to each member (Owner only)' },
              { type: BowlType.SHUFFLE_ENTRIES, title: 'Shuffle Entries', description: 'Shuffle the order of all entries (Owner only)' }
            ].map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.typeOption,
                  newBowl.type === option.type && styles.selectedTypeOption
                ]}
                onPress={() => setNewBowl({ ...newBowl, type: option.type })}
              >
                <View style={styles.typeOptionContent}>
                  <Text style={[
                    styles.typeOptionTitle,
                    newBowl.type === option.type && styles.selectedTypeOptionText
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={[
                    styles.typeOptionDescription,
                    newBowl.type === option.type && styles.selectedTypeOptionDescription
                  ]}>
                    {option.description}
                  </Text>
                </View>
                {newBowl.type === option.type && (
                  <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
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
          <Text style={styles.helperText}>Tip: Share your bowl with friends so they can join and add entries!</Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.modalActionButton} onPress={addBowl}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.modalActionText}>Add</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]} onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={22} color="#fff" />
              <Text style={styles.modalActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Modal for adding an entry to a bowl */}
      <Modal visible={entryModalVisible} animationType="slide" transparent>
        <View style={styles.entryModalOverlay}>
          <View style={styles.entryModalContent}>
            <Text style={styles.modalLabel}>Add Entry</Text>
            <Text style={styles.helperText}>Add your suggestion or input to this bowl.</Text>
            {!userName && (
              <TextInput
                placeholder="Your Name"
                value={userName}
                onChangeText={saveUserName}
                style={styles.input}
              />
            )}
            <TextInput
              placeholder="Enter your entry"
              value={entryText}
              onChangeText={setEntryText}
              style={styles.input}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalActionButton} onPress={handleAddEntry} disabled={!entryText.trim()}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.modalActionText}>Submit</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]} onPress={() => setEntryModalVisible(false)}>
                <Ionicons name="close-circle" size={22} color="#fff" />
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal for displaying members list */}
      <Modal visible={membersModalVisible} animationType="slide" transparent>
        <View style={styles.entryModalOverlay}>
          <View style={styles.entryModalContent}>
            <Text style={styles.modalLabel}>Members List</Text>
            <Text style={styles.helperText}>
              {selectedBowl ? `${selectedBowl.name} - Members` : 'Members'}
            </Text>
            {selectedBowl && Array.isArray(selectedBowl.listMembers) && selectedBowl.listMembers.length > 0 ? (
              <ScrollView style={styles.scrollableList} showsVerticalScrollIndicator={true}>
                {selectedBowl.listMembers.map((member, index) => (
                  <View key={member.id || index} style={styles.listItem}>
                    <Text style={styles.listItemText}>{member.name || 'Unknown Member'}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyListText}>No members joined yet</Text>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]} 
                onPress={() => setMembersModalVisible(false)}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
                <Text style={styles.modalActionText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for displaying entries list */}
      <Modal visible={entriesModalVisible} animationType="slide" transparent>
        <View style={styles.entryModalOverlay}>
          <View style={styles.entryModalContent}>
            <Text style={styles.modalLabel}>Entries List</Text>
            <Text style={styles.helperText}>
              {selectedBowl ? `${selectedBowl.name} - Entries` : 'Entries'}
            </Text>
            {selectedBowl && Array.isArray(selectedBowl.listEntries) && selectedBowl.listEntries.length > 0 ? (
              <ScrollView style={styles.scrollableList} showsVerticalScrollIndicator={true}>
                {selectedBowl.listEntries.map((entry, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.entryContent}>
                      <View style={styles.entryTextContainer}>
                        <Text style={styles.listItemText}>{entry.text}</Text>
                        <Text style={styles.entryUserText}>- {entry.userName}</Text>
                      </View>
                      {/* Show delete button only for bowl owner */}
                      {selectedBowl.ownerId === user.id && (
                        <TouchableOpacity
                          style={styles.deleteEntryButton}
                          onPress={() => handleDeleteEntry(selectedBowl, entry.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyListText}>No entries added yet</Text>
            )}
            <View style={styles.modalButtonRow}>
              {/* Clear Entries button - only visible to bowl owner */}
              {selectedBowl && selectedBowl.ownerId === user.id && Array.isArray(selectedBowl.listEntries) && selectedBowl.listEntries.length > 0 && (
                <TouchableOpacity 
                  style={[styles.modalActionButton, { backgroundColor: '#F59E0B' }]} 
                  onPress={() => handleClearEntries(selectedBowl)}
                >
                  <Ionicons name="trash" size={22} color="#fff" />
                  <Text style={styles.modalActionText}>Clear All</Text>
                </TouchableOpacity>
              )}
              
              {/* Shuffle button - visibility depends on bowl type */}
              {selectedBowl && Array.isArray(selectedBowl.listEntries) && selectedBowl.listEntries.length > 0 && canUserShuffle(selectedBowl) && (
                <>
                  {selectedBowl.ownerId === user.id && <View style={{ width: 12 }} />}
                  <TouchableOpacity 
                    style={[styles.modalActionButton, { backgroundColor: '#7C3AED' }]} 
                    onPress={() => handleJuggle(selectedBowl)}
                  >
                    <Ionicons name="shuffle" size={22} color="#fff" />
                    <Text style={styles.modalActionText}>{getShuffleButtonText(selectedBowl.type)}</Text>
                  </TouchableOpacity>
                </>
              )}
              
              <View style={{ width: 12 }} />
              <TouchableOpacity 
                style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]} 
                onPress={() => setEntriesModalVisible(false)}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
                <Text style={styles.modalActionText}>Close</Text>
              </TouchableOpacity>
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
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  addButtonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    elevation: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 2,
  },
  fabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
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
  helperText: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 12, padding: 8, borderRadius: 4 },
  modalButtonRow: { 
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    marginTop: 8 
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 20,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalActionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  shareButtonRow: {
    marginTop: 10,
    justifyContent: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iconButtonText: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#444',
    fontSize: 15,
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
    maxHeight: '80%',
  },
  scrollableList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  listItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  listItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  entryUserText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyListText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 16,
  },
  typeSelection: {
    maxHeight: 200,
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedTypeOption: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
    borderWidth: 2,
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  selectedTypeOptionText: {
    color: '#7C3AED',
  },
  typeOptionDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  selectedTypeOptionDescription: {
    color: '#8B5CF6',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  entryTextContainer: {
    flex: 1,
  },
  deleteEntryButton: {
    padding: 8,
    marginLeft: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});
