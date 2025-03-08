import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import BleManager from './BluetoothManager';

const { BluetoothAudio } = NativeModules;

/**
 * Utility class for recording audio from Bluetooth devices
 */
class BluetoothRecorder {
  constructor() {
    this.isRecording = false;
    this.outputFilePath = null;
    this.currentDeviceId = null;
    this.amplitudePollingInterval = null;
  }

  /**
   * Request audio recording permissions
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ]);
        
        return (
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Error requesting permissions:', err);
        return false;
      }
    } else {
      // For iOS, Expo handles permissions
      const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      return status === 'granted';
    }
  }

  /**
   * Start recording from a Bluetooth device
   * @param {string} deviceId - Optional Bluetooth device ID to record from
   * @param {function} onAmplitudeUpdate - Optional callback for amplitude updates
   * @returns {Promise<object>} Recording info object or error
   */
  async startRecording(deviceId = null, onAmplitudeUpdate = null) {
    if (this.isRecording) {
      return { error: 'Already recording' };
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return { error: 'Permission denied' };
      }

      // Create directory if it doesn't exist
      const directory = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(directory);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      // Generate a filename with timestamp
      const timestamp = new Date().getTime();
      this.outputFilePath = `${directory}recording_${timestamp}.m4a`;
      
      this.currentDeviceId = deviceId;

      // If using a Bluetooth device, try to enable SCO
      if (deviceId && deviceId.startsWith('bt_')) {
        await BleManager.startBluetoothSco();
      }

      // Start the recording
      const started = await BluetoothAudio.startRecording(this.outputFilePath, deviceId);
      
      if (!started) {
        return { error: 'Failed to start recording' };
      }

      this.isRecording = true;

      // Set up amplitude polling if callback provided
      if (onAmplitudeUpdate && typeof onAmplitudeUpdate === 'function') {
        this.amplitudePollingInterval = setInterval(async () => {
          if (!this.isRecording) {
            clearInterval(this.amplitudePollingInterval);
            return;
          }

          try {
            const amplitude = await BluetoothAudio.getMaxAmplitude();
            onAmplitudeUpdate(amplitude);
          } catch (error) {
            console.error('Error getting amplitude:', error);
          }
        }, 100);
      }

      return {
        success: true,
        filePath: this.outputFilePath,
        deviceId: this.currentDeviceId
      };

    } catch (error) {
      console.error('Error starting recording:', error);
      return { error: error.message || 'Unknown error starting recording' };
    }
  }

  /**
   * Stop the current recording
   * @returns {Promise<object>} Recording result object or error
   */
  async stopRecording() {
    if (!this.isRecording) {
      return { error: 'Not recording' };
    }

    try {
      // Clear amplitude polling interval
      if (this.amplitudePollingInterval) {
        clearInterval(this.amplitudePollingInterval);
        this.amplitudePollingInterval = null;
      }

      // Stop the recording
      const result = await BluetoothAudio.stopRecording();
      this.isRecording = false;

      // If using Bluetooth, stop SCO
      if (this.currentDeviceId && this.currentDeviceId.startsWith('bt_')) {
        await BleManager.stopBluetoothSco();
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(this.outputFilePath);
      
      if (!fileInfo.exists || fileInfo.size === 0) {
        return {
          success: false,
          error: 'Recording file is empty or does not exist',
          filePath: this.outputFilePath
        };
      }

      return {
        success: true,
        filePath: this.outputFilePath,
        size: fileInfo.size,
        uri: fileInfo.uri,
        deviceId: this.currentDeviceId
      };

    } catch (error) {
      console.error('Error stopping recording:', error);
      return { error: error.message || 'Unknown error stopping recording' };
    } finally {
      this.isRecording = false;
      this.currentDeviceId = null;
    }
  }

  /**
   * Check if currently recording
   * @returns {boolean}
   */
  isCurrentlyRecording() {
    return this.isRecording;
  }

  /**
   * Get available audio sources
   * @returns {Promise<Array>}
   */
  async getAvailableAudioSources() {
    try {
      return await BleManager.getAvailableAudioSources();
    } catch (error) {
      console.error('Error getting audio sources:', error);
      return [];
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.isRecording) {
      this.stopRecording().catch(err => 
        console.error('Error stopping recording during cleanup:', err)
      );
    }
    
    if (this.amplitudePollingInterval) {
      clearInterval(this.amplitudePollingInterval);
      this.amplitudePollingInterval = null;
    }

    this.isRecording = false;
    this.outputFilePath = null;
    this.currentDeviceId = null;
  }
}

export default new BluetoothRecorder();
