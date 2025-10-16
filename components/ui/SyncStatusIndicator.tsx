import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, syncInProgress, lastSync } = useSelector((state: RootState) => state.sync);
  const { isConnected } = useSelector((state: RootState) => state.network);

  const getStatusColor = () => {
    if (syncInProgress) return '#007AFF';
    if (isConnected && isOnline) return '#34C759';
    if (!isConnected) return '#FF9500';
    return '#FF3B30';
  };

  const getStatusText = () => {
    if (syncInProgress) return 'Synchronisation...';
    if (isConnected && isOnline) return 'En ligne';
    if (!isConnected) return 'Hors ligne';
    return 'Erreur';
  };

  const getStatusIcon = () => {
    if (syncInProgress) return '🔄';
    if (isConnected && isOnline) return '🟢';
    if (!isConnected) return '🟡';
    return '🔴';
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        {syncInProgress && (
          <ActivityIndicator size="small" color="#fff" style={styles.loader} />
        )}
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.text}>{getStatusText()}</Text>
        {lastSync && !syncInProgress && (
          <Text style={styles.lastSyncText}>
            {formatLastSync(lastSync)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 32,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loader: {
    position: 'absolute',
  },
  icon: {
    fontSize: 6,
    color: '#fff',
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },
});
