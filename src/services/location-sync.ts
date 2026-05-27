import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { useLocationStore } from '@/src/store/location-store';
import type { LocationVisit } from '@/src/types/location';

export const LOCATION_SYNC_TASK = 'wenwen-location-sync';

type LocationSyncStatus = 'idle' | 'checking' | 'ready' | 'services-off' | 'permission-denied' | 'unavailable' | 'error';
type LocationModuleWithBackground = typeof Location & {
  hasStartedLocationUpdatesAsync?: (taskName: string) => Promise<boolean>;
  startLocationUpdatesAsync?: typeof Location.startLocationUpdatesAsync;
  stopLocationUpdatesAsync?: typeof Location.stopLocationUpdatesAsync;
};

export type LocationSyncResult = {
  status: LocationSyncStatus;
  message: string;
};

function createVisitId() {
  return `visit-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}

function compactAddress(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) return { label: 'Current place', detail: 'Location synced' };

  const label =
    address.name ||
    address.street ||
    address.district ||
    address.city ||
    address.region ||
    address.country ||
    'Current place';
  const detailParts = [address.district, address.city, address.region, address.country].filter(
    (part): part is string => Boolean(part && part !== label)
  );

  return {
    label,
    detail: detailParts.length > 0 ? detailParts.join(', ') : 'Location synced',
  };
}

async function createVisitFromLocation(location: Location.LocationObject): Promise<LocationVisit> {
  let address: Location.LocationGeocodedAddress | undefined;

  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    address = addresses[0];
  } catch {
    address = undefined;
  }

  const addressText = compactAddress(address);

  return {
    id: createVisitId(),
    label: addressText.label,
    detail: addressText.detail,
    latitude: roundCoordinate(location.coords.latitude),
    longitude: roundCoordinate(location.coords.longitude),
    accuracy: location.coords.accuracy,
    createdAt: new Date(location.timestamp).toISOString(),
  };
}

async function saveVisitFromLocation(location: Location.LocationObject) {
  await useLocationStore.persist.rehydrate();
  const visit = await createVisitFromLocation(location);
  useLocationStore.getState().addVisit(visit);
}

TaskManager.defineTask(LOCATION_SYNC_TASK, async ({ data, error }) => {
  if (error) return;

  const payload = data as { locations?: Location.LocationObject[] } | undefined;
  const latestLocation = payload?.locations?.[payload.locations.length - 1];
  if (!latestLocation) return;

  await saveVisitFromLocation(latestLocation);
});

export async function startLocationAutoSync(): Promise<LocationSyncResult> {
  const locationModule = Location as LocationModuleWithBackground;
  useLocationStore.getState().setAutoSyncState({
    status: 'checking',
    message: 'Starting place auto-sync.',
  });

  try {
    if (Platform.OS === 'web') {
      const result = { status: 'unavailable' as const, message: 'Place auto-sync is not available on web.' };
      useLocationStore.getState().setAutoSyncState({
        enabled: false,
        status: result.status,
        message: result.message,
      });
      return result;
    }

    if (!locationModule.startLocationUpdatesAsync || !locationModule.hasStartedLocationUpdatesAsync) {
      const result = {
        status: 'unavailable' as const,
        message: 'This build does not support background place auto-sync yet.',
      };
      useLocationStore.getState().setAutoSyncState({
        enabled: false,
        status: result.status,
        message: result.message,
      });
      return result;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      const result = { status: 'services-off' as const, message: 'Location services are off on this device.' };
      useLocationStore.getState().setAutoSyncState({
        enabled: false,
        status: result.status,
        message: result.message,
      });
      return result;
    }

    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    if (!foregroundPermission.granted) {
      const result = { status: 'permission-denied' as const, message: 'Location permission is off for Wenwen.' };
      useLocationStore.getState().setAutoSyncState({
        enabled: false,
        status: result.status,
        message: result.message,
      });
      return result;
    }

    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    if (!backgroundPermission.granted) {
      const result = { status: 'permission-denied' as const, message: 'Background location permission is off for Wenwen.' };
      useLocationStore.getState().setAutoSyncState({
        enabled: false,
        status: result.status,
        message: result.message,
      });
      return result;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await saveVisitFromLocation(currentLocation);

    const hasStarted = await locationModule.hasStartedLocationUpdatesAsync(LOCATION_SYNC_TASK);
    if (!hasStarted) {
      await locationModule.startLocationUpdatesAsync(LOCATION_SYNC_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 200,
        timeInterval: 15 * 60 * 1000,
        pausesUpdatesAutomatically: true,
        foregroundService: {
          notificationTitle: 'Wenwen place sync',
          notificationBody: 'Wenwen is saving places you visit.',
          notificationColor: '#58CFC6',
        },
      });
    }

    const result = { status: 'ready' as const, message: 'Place auto-sync is on.' };
    useLocationStore.getState().setAutoSyncState({
      enabled: true,
      status: result.status,
      message: result.message,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start place auto-sync.';
    useLocationStore.getState().setAutoSyncState({
      enabled: false,
      status: 'error',
      message,
    });
    return { status: 'error', message };
  }
}

export async function stopLocationAutoSync() {
  const locationModule = Location as LocationModuleWithBackground;
  if (locationModule.hasStartedLocationUpdatesAsync && locationModule.stopLocationUpdatesAsync) {
    const hasStarted = await locationModule.hasStartedLocationUpdatesAsync(LOCATION_SYNC_TASK);
    if (hasStarted) {
      await locationModule.stopLocationUpdatesAsync(LOCATION_SYNC_TASK);
    }
  }
  useLocationStore.getState().setAutoSyncState({
    enabled: false,
    status: 'idle',
    message: 'Place auto-sync is off.',
  });
}
