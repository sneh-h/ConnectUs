import { ref, set, onValue, off, push } from 'firebase/database';
import { realtimeDb } from './config';

export const updateUserLocation = (userId, location) => {
  const locationRef = ref(realtimeDb, `locations/${userId}`);
  return set(locationRef, {
    ...location,
    timestamp: Date.now()
  });
};

export const subscribeToGroupLocations = (groupId, callback) => {
  const groupRef = ref(realtimeDb, `groups/${groupId}/members`);
  onValue(groupRef, callback);
  return () => off(groupRef, callback);
};

export const joinGroup = (groupId, userId, userInfo, isCreator = false) => {
  const memberRef = ref(realtimeDb, `groups/${groupId}/members/${userId}`);
  return set(memberRef, {
    ...userInfo,
    role: isCreator ? 'admin' : 'member'
  });
};

export const createGroup = (groupId, creatorId, groupInfo) => {
  const groupRef = ref(realtimeDb, `groups/${groupId}`);
  return set(groupRef, {
    ...groupInfo,
    creator: creatorId,
    created: Date.now()
  });
};

export const setMemberRole = (groupId, userId, role) => {
  const memberRef = ref(realtimeDb, `groups/${groupId}/members/${userId}/role`);
  return set(memberRef, role);
};

// Chat functions
export const sendMessage = (groupId, message) => {
  const messagesRef = ref(realtimeDb, `groups/${groupId}/messages`);
  return push(messagesRef, message);
};

export const subscribeToMessages = (groupId, callback) => {
  const messagesRef = ref(realtimeDb, `groups/${groupId}/messages`);
  onValue(messagesRef, callback);
  return () => off(messagesRef, callback);
};

// Emergency functions
export const sendEmergencyAlert = (groupId, alert) => {
  const emergencyRef = ref(realtimeDb, `groups/${groupId}/emergencies`);
  return push(emergencyRef, alert);
};

export const acknowledgeAlert = (groupId, alertId, userId) => {
  const ackRef = ref(realtimeDb, `groups/${groupId}/emergencies/${alertId}/acknowledged/${userId}`);
  return set(ackRef, {
    userId,
    timestamp: Date.now()
  });
};

export const subscribeToEmergencyAlerts = (groupId, callback) => {
  const emergencyRef = ref(realtimeDb, `groups/${groupId}/emergencies`);
  onValue(emergencyRef, callback);
  return () => off(emergencyRef, callback);
};

// Check if group exists by code
export const checkGroupExists = async (groupCode) => {
  const { get } = await import('firebase/database');
  const groupsRef = ref(realtimeDb, 'groups');
  const snapshot = await get(groupsRef);
  
  if (snapshot.exists()) {
    const groups = snapshot.val();
    for (const [groupId, groupData] of Object.entries(groups)) {
      if (groupData.code === groupCode) {
        return groupId; // Return the actual group ID
      }
    }
  }
  return null;
};

// Get group ID by code
export const getGroupIdByCode = async (groupCode) => {
  return await checkGroupExists(groupCode);
};