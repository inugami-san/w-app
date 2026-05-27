import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLocationStore } from '@/src/store/location-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { LocationVisit } from '@/src/types/location';

type LocationVisitsCardProps = {
  compact?: boolean;
};

function formatVisitTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved';

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(left: LocationVisit, right: LocationVisit) {
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getTracedDistanceMeters(visits: LocationVisit[]) {
  const chronologicalVisits = [...visits].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );

  return chronologicalVisits.reduce((total, visit, index) => {
    const previousVisit = chronologicalVisits[index - 1];
    if (!previousVisit) return total;
    return total + getDistanceMeters(previousVisit, visit);
  }, 0);
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

export function LocationVisitsCard({ compact = false }: LocationVisitsCardProps) {
  const theme = useAppTheme();
  const visits = useLocationStore((state) => state.visits);
  const autoSyncEnabled = useLocationStore((state) => state.autoSyncEnabled);
  const autoSyncStatus = useLocationStore((state) => state.autoSyncStatus);
  const autoSyncMessage = useLocationStore((state) => state.autoSyncMessage);
  const visibleVisits = visits.slice(0, compact ? 2 : 5);
  const tracedDistance = getTracedDistanceMeters(visits);
  const lastVisit = visits[0];
  const statusText =
    autoSyncStatus === 'permission-denied' ||
    autoSyncStatus === 'services-off' ||
    autoSyncStatus === 'unavailable' ||
    autoSyncStatus === 'error'
      ? autoSyncMessage
      : '';

  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.label, { color: theme.textStrong }]}>Places</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>
            {autoSyncEnabled ? 'auto-sync on' : autoSyncStatus === 'checking' ? 'starting sync' : 'auto-sync pending'}
          </Text>
        </View>
        <View
          accessibilityRole="image"
          accessibilityLabel={autoSyncEnabled ? 'Place auto-sync is on' : 'Place auto-sync is pending'}
          style={[
            styles.statusIcon,
            {
              backgroundColor: autoSyncEnabled ? theme.primarySoft : theme.softSurface,
              borderColor: autoSyncEnabled ? theme.primary : theme.softBorder,
            },
          ]}
        >
          <Ionicons
            name={autoSyncStatus === 'checking' ? 'hourglass-outline' : autoSyncEnabled ? 'navigate' : 'navigate-outline'}
            size={16}
            color={theme.primaryStrong}
          />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryItem, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
          <Text style={[styles.summaryValue, { color: theme.primaryStrong }]}>
            {formatDistance(tracedDistance)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>distance</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
          <Text style={[styles.summaryValue, { color: theme.primaryStrong }]}>{visits.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.muted }]}>places</Text>
        </View>
        {!compact && (
          <View style={[styles.summaryItem, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Text style={[styles.summaryValue, { color: theme.primaryStrong }]}>
              {lastVisit ? formatVisitTime(lastVisit.createdAt) : '-'}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.muted }]}>latest</Text>
          </View>
        )}
      </View>

      <View style={styles.visitList}>
        {visibleVisits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Ionicons name="map-outline" size={18} color={theme.primaryStrong} />
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {autoSyncEnabled ? 'Waiting for movement.' : 'Auto-sync will start when location permission is available.'}
            </Text>
          </View>
        ) : (
          visibleVisits.map((visit) => (
            <View
              key={visit.id}
              style={[styles.visitItem, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}
            >
              <View style={[styles.visitIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="pin-outline" size={15} color={theme.primaryStrong} />
              </View>
              <View style={styles.visitTextWrap}>
                <Text style={[styles.visitLabel, { color: theme.textStrong }]} numberOfLines={1}>
                  {visit.label}
                </Text>
                <Text style={[styles.visitDetail, { color: theme.muted }]} numberOfLines={1}>
                  {visit.detail} · {formatVisitTime(visit.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {statusText ? <Text style={[styles.statusText, { color: theme.muted }]}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  compactContainer: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  summaryItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  visitList: {
    gap: 8,
    marginTop: 12,
  },
  emptyState: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  visitItem: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  visitIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  visitLabel: {
    fontSize: 13,
    fontWeight: '900',
  },
  visitDetail: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },
});
