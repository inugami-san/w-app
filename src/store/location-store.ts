import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LocationVisit } from '@/src/types/location';

const MAX_LOCATION_VISITS = 30;
const MIN_VISIT_DISTANCE_METERS = 180;

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

type LocationStore = {
  visits: LocationVisit[];
  autoSyncEnabled: boolean;
  autoSyncStatus: 'idle' | 'checking' | 'ready' | 'services-off' | 'permission-denied' | 'unavailable' | 'error';
  autoSyncMessage: string;
  hasHydrated: boolean;
  addVisit: (visit: LocationVisit) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setAutoSyncState: (state: {
    enabled?: boolean;
    status?: LocationStore['autoSyncStatus'];
    message?: string;
  }) => void;
  clearVisits: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      visits: [],
      autoSyncEnabled: false,
      autoSyncStatus: 'idle',
      autoSyncMessage: '',
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addVisit: (visit) =>
        set((state) => {
          const latestVisit = state.visits[0];
          if (latestVisit && getDistanceMeters(latestVisit, visit) < MIN_VISIT_DISTANCE_METERS) {
            return {
              visits: [
                {
                  ...latestVisit,
                  accuracy: visit.accuracy,
                  createdAt: visit.createdAt,
                },
                ...state.visits.slice(1),
              ],
            };
          }

          return {
            visits: [visit, ...state.visits].slice(0, MAX_LOCATION_VISITS),
          };
        }),
      setAutoSyncEnabled: (autoSyncEnabled) => set({ autoSyncEnabled }),
      setAutoSyncState: ({ enabled, status, message }) =>
        set((state) => ({
          autoSyncEnabled: enabled ?? state.autoSyncEnabled,
          autoSyncStatus: status ?? state.autoSyncStatus,
          autoSyncMessage: message ?? state.autoSyncMessage,
        })),
      clearVisits: () => set({ visits: [] }),
    }),
    {
      name: 'wenwen-location-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        visits: state.visits,
        autoSyncEnabled: state.autoSyncEnabled,
        autoSyncStatus: state.autoSyncStatus,
        autoSyncMessage: state.autoSyncMessage,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
