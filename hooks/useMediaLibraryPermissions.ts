import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';

type PermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'limited'
  | 'blocked';

export function useMediaLibraryPermissions() {
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('undetermined');
  const [isPermissionModalVisible, setPermissionModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);

  const checkPermissionStatus = useCallback(async () => {
    const { status, canAskAgain } =
      await ImagePicker.getMediaLibraryPermissionsAsync();
    setPermissionStatus(status);

    // If denied and can't ask again, it's permanently denied
    if (status !== 'granted' && !canAskAgain) {
      setIsPermanentlyDenied(true);
    }
  }, []);

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  const requestPermission = useCallback(async () => {
    // If already granted, return immediately
    if (permissionStatus === 'granted') {
      return 'granted';
    }

    // If permanently denied, show settings modal
    if (isPermanentlyDenied) {
      setPermissionModalVisible(true);
      return 'denied';
    }

    // Request permission
    const { status, canAskAgain } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') {
      setPermissionModalVisible(true);

      if (!canAskAgain) {
        setIsPermanentlyDenied(true);
      }
    } else {
      setPermissionModalVisible(false);
    }

    return status;
  }, [permissionStatus, isPermanentlyDenied]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
    setPermissionModalVisible(false);
  }, []);

  const hidePermissionModal = useCallback(() => {
    setPermissionModalVisible(false);
  }, []);

  return {
    permissionStatus,
    isPermissionModalVisible,
    isPermanentlyDenied,
    requestPermission,
    openSettings,
    hidePermissionModal,
  };
}
