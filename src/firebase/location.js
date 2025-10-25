import { ref, set, onValue, off, push } from 'firebase/database';
import { realtimeDb } from './config';

export const updateUserLocation = (userId, location) => {
  const locationRef = ref(realtimeDb, `locations/${userId}`);
  return set(locationRef, {
    ...location,
    timestamp: Date.now()
  });
};

export const updateGroupMemberLocation = async (groupId, userId, location) => {
  const memberRef = ref(realtimeDb, `groups/${groupId}/members/${userId}`);
  
  // Get existing member data to preserve role
  const { get } = await import('firebase/database');
  const snapshot = await get(memberRef);
  const existingData = snapshot.exists() ? snapshot.val() : {};
  
  return set(memberRef, {
    ...existingData, // Preserve existing data including role
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
  onValue(messagesRef, callback, { onlyOnce: false });
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
  onValue(emergencyRef, callback, { onlyOnce: false });
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

// Member request functions
export const sendMemberRequest = (groupId, request) => {
  const requestsRef = ref(realtimeDb, `groups/${groupId}/memberRequests`);
  return push(requestsRef, {
    ...request,
    timestamp: Date.now(),
    status: 'pending'
  });
};

export const subscribeToMemberRequests = (groupId, callback) => {
  const requestsRef = ref(realtimeDb, `groups/${groupId}/memberRequests`);
  onValue(requestsRef, callback, { onlyOnce: false });
  return () => off(requestsRef, callback);
};

export const approveMemberRequest = (groupId, requestId, userId, userInfo) => {
  const memberRef = ref(realtimeDb, `groups/${groupId}/members/${userId}`);
  const requestRef = ref(realtimeDb, `groups/${groupId}/memberRequests/${requestId}`);
  
  // Add member to group - ALWAYS as 'member', never admin
  set(memberRef, {
    ...userInfo,
    role: 'member', // Force member role for approved requests
    joinedAt: Date.now()
  });
  
  // Update request status
  return set(requestRef, null); // Remove the request
};

export const rejectMemberRequest = (groupId, requestId) => {
  const requestRef = ref(realtimeDb, `groups/${groupId}/memberRequests/${requestId}`);
  return set(requestRef, null); // Remove the request
};

// Notification functions
export const sendNotification = (groupId, notification) => {
  const notificationsRef = ref(realtimeDb, `groups/${groupId}/notifications`);
  return push(notificationsRef, {
    ...notification,
    timestamp: Date.now()
  });
};

export const subscribeToNotifications = (groupId, userId, callback) => {
  const notificationsRef = ref(realtimeDb, `groups/${groupId}/notifications`);
  onValue(notificationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const notifications = Object.entries(snapshot.val())
        .map(([id, notif]) => ({ id, ...notif }))
        .filter(notif => !notif.userId || notif.userId === userId || notif.type === 'broadcast');
      callback({ val: () => notifications });
    } else {
      callback({ val: () => [] });
    }
  });
  return () => off(notificationsRef);
};

// Privacy settings functions
export const updatePrivacySettings = (groupId, userId, settings) => {
  const privacyRef = ref(realtimeDb, `groups/${groupId}/privacy/${userId}`);
  return set(privacyRef, settings);
};

export const getPrivacySettings = async (groupId, userId) => {
  const { get } = await import('firebase/database');
  const privacyRef = ref(realtimeDb, `groups/${groupId}/privacy/${userId}`);
  const snapshot = await get(privacyRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const canViewLocation = async (groupId, locationOwnerId, viewerId) => {
  if (locationOwnerId === viewerId) return true;
  
  const settings = await getPrivacySettings(groupId, locationOwnerId);
  if (!settings || settings.shareWith === 'all') return true;
  
  return settings.selectedMembers && settings.selectedMembers.includes(viewerId);
};

export const updateGroupMemberLocationWithPrivacy = async (groupId, userId, location) => {
  const settings = await getPrivacySettings(groupId, userId);
  
  // Always update the location in the database
  await updateGroupMemberLocation(groupId, userId, location);
  
  // The privacy filtering happens on the client side when reading locations
  return true;
};