import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { BluetoothManager, BluetoothAudio } = NativeModules;

// Create event emitters for native modules
const bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
const bluetoothAudioEmitter = new NativeEventEmitter(BluetoothAudio);

// Define constants
const BOND_STATES = {
  NONE: BluetoothManager?.BOND_NONE || 10,
  BONDING: BluetoothManager?.BOND_BONDING || 11,
  BONDED: BluetoothManager?.BOND_BONDED || 12,
};

const BleManager = {
  // Initialize the module
  initialize: async () => {
    console.log('BluetoothManager: Initializing...');
    return true;
  },

  // Get Bluetooth state
  getState: async () => {
    try {
      const state = await BluetoothManager.getBluetoothState();
      return state;
    } catch (error) {
      console.error('Error getting Bluetooth state:', error);
      return 'Unknown';
    }
  },

  // Check if Bluetooth is enabled
  isBluetoothEnabled: async () => {
    try {
      return await BluetoothManager.isBluetoothEnabled();
    } catch (error) {
      console.error('Error checking if Bluetooth is enabled:', error);
      return false;
    }
  },

  // Enable Bluetooth
  enableBluetooth: async () => {
    try {
      return await BluetoothManager.enableBluetooth();
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      return false;
    }
  },

  // Get paired devices
  getPairedDevices: async () => {
    try {
      return await BluetoothManager.getPairedDevices();
    } catch (error) {
      console.error('Error getting paired devices:', error);
      return [];
    }
  },

  // Get connected devices
  getConnectedDevices: async () => {
    try {
      return await BluetoothManager.getConnectedDevices();
    } catch (error) {
      console.error('Error getting connected devices:', error);
      return [];
    }
  },

  // Get system connected devices
  checkSystemConnectedDevices: async () => {
    try {
      return await BluetoothManager.getConnectedDevices();
    } catch (error) {
      console.error('Error checking system connected devices:', error);
      return [];
    }
  },

  // Check if a device is connected
  getDeviceConnectionStatus: async (deviceId) => {
    try {
      const isConnected = await BluetoothManager.isDeviceConnected(deviceId);
      return { isConnected, deviceId };
    } catch (error) {
      console.error(`Error checking connection status for device ${deviceId}:`, error);
      return { isConnected: false, deviceId };
    }
  },

  // Check if a device is paired
  isDevicePaired: async (deviceId) => {
    try {
      return await BluetoothManager.isDevicePaired(deviceId);
    } catch (error) {
      console.error(`Error checking if device ${deviceId} is paired:`, error);
      return false;
    }
  },

  // Pair a device
  pairDevice: async (deviceId) => {
    try {
      return await BluetoothManager.pairDevice(deviceId);
    } catch (error) {
      console.error(`Error pairing device ${deviceId}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Open Bluetooth settings
  openBluetoothSettings: async () => {
    try {
      return await BluetoothManager.openBluetoothSettings();
    } catch (error) {
      console.error('Error opening Bluetooth settings:', error);
      return false;
    }
  },

  // Audio functions

  // Check if Bluetooth SCO is available
  isBluetoothScoAvailable: async () => {
    if (!BluetoothAudio) return false;
    try {
      return await BluetoothAudio.isBluetoothScoAvailable();
    } catch (error) {
      console.error('Error checking if Bluetooth SCO is available:', error);
      return false;
    }
  },

  // Start Bluetooth SCO
  startBluetoothSco: async () => {
    if (!BluetoothAudio) return false;
    try {
      return await BluetoothAudio.startBluetoothSco();
    } catch (error) {
      console.error('Error starting Bluetooth SCO:', error);
      return false;
    }
  },

  // Stop Bluetooth SCO
  stopBluetoothSco: async () => {
    if (!BluetoothAudio) return false;
    try {
      return await BluetoothAudio.stopBluetoothSco();
    } catch (error) {
      console.error('Error stopping Bluetooth SCO:', error);
      return false;
    }
  },

  // Get audio routing
  getAudioRouting: async () => {
    if (!BluetoothAudio) return {};
    try {
      return await BluetoothAudio.getAudioRouting();
    } catch (error) {
      console.error('Error getting audio routing:', error);
      return {};
    }
  },

  // Recording functions

  // Get available audio sources
  getAvailableAudioSources: async () => {
    if (!BluetoothAudio) return [];
    try {
      return await BluetoothAudio.getAvailableAudioSources();
    } catch (error) {
      console.error('Error getting audio sources:', error);
      return [];
    }
  },

  // Start recording
  startRecording: async (filePath, deviceId = null) => {
    if (!BluetoothAudio) return false;
    try {
      return await BluetoothAudio.startRecording(filePath, deviceId);
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  },

  // Stop recording
  stopRecording: async () => {
    if (!BluetoothAudio) return null;
    try {
      return await BluetoothAudio.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  },

  // Check if recording
  isRecording: async () => {
    if (!BluetoothAudio) return false;
    try {
      return await BluetoothAudio.isRecording();
    } catch (error) {
      console.error('Error checking if recording:', error);
      return false;
    }
  },

  // Get max amplitude
  getMaxAmplitude: async () => {
    if (!BluetoothAudio) return 0;
    try {
      return await BluetoothAudio.getMaxAmplitude();
    } catch (error) {
      console.error('Error getting max amplitude:', error);
      return 0;
    }
  },

  // Add a listener for Bluetooth events
  addListener: (event, callback) => {
    if (typeof callback !== 'function') {
      console.error('Bluetooth listener callback must be a function');
      return { remove: () => {} };
    }

    // Route to the appropriate event emitter based on event type
    const audioEvents = ['recordingStarted', 'recordingStopped'];
    
    if (audioEvents.includes(event) && BluetoothAudio) {
      return bluetoothAudioEmitter.addListener(event, callback);
    }
    
    return bluetoothManagerEmitter.addListener(event, callback);
  },

  // Utility to request audio device use
  requestAudioDevice: async (deviceId) => {
    try {
      return await BluetoothManager.requestAudioDevice(deviceId);
    } catch (error) {
      console.error(`Error requesting audio device ${deviceId}:`, error);
      return false;
    }
  },

  // Get active audio devices
  getActiveAudioDevices: async () => {
    try {
      return await BluetoothManager.getActiveAudioDevices();
    } catch (error) {
      console.error('Error getting active audio devices:', error);
      return [];
    }
  },

  // Cleanup resources
  cleanup: async () => {
    if (BluetoothAudio) {
      // Stop any ongoing recording
      try {
        const isRecording = await BluetoothAudio.isRecording();
        if (isRecording) {
          await BluetoothAudio.stopRecording();
        }
      } catch (error) {
        console.warn('Error stopping recording during cleanup:', error);
      }

      // Stop Bluetooth SCO
      try {
        await BluetoothAudio.stopBluetoothSco();
      } catch (error) {
        console.warn('Error stopping Bluetooth SCO during cleanup:', error);
      }
    }
    
    return true;
  },

  // Perform a more aggressive cleanup for navigation changes
  navigationalCleanup: async () => {
    return BleManager.cleanup();
  },

  // Destroy the module (placeholder - actual cleanup is done in the native module)
  destroy: () => {
    console.log('BluetoothManager: Destroying...');
    BleManager.cleanup();
  },

  // Just to maintain API compatibility with previous implementation
  safeDisconnectDevice: async (deviceId) => {
    return true;
  }
};

export default BleManager;
