import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ScrollView,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AudioUtils, { AudioFormat } from '../modules/AudioUtilsJS';
import AudioDeviceModule from '../modules/AudioDeviceModule';

const CalibrationScreen = ({ navigation, route }) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingPath, setRecordingPath] = useState(null);
  const [leftChannelPath, setLeftChannelPath] = useState(null);
  const [rightChannelPath, setRightChannelPath] = useState(null);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  
  // Device selection state
  const [isScanning, setIsScanning] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceSelectorVisible, setDeviceSelectorVisible] = useState(false);
  
  // Playback state
  const [isPlayingLeft, setIsPlayingLeft] = useState(false);
  const [isPlayingRight, setIsPlayingRight] = useState(false);
  
  // Sound refs for playback
  const leftSoundRef = useRef(null);
  const rightSoundRef = useRef(null);
  
  // Event subscription refs
  const deviceConnectedSubscription = useRef(null);
  const deviceDisconnectedSubscription = useRef(null);
  const deviceListChangedSubscription = useRef(null);

  useEffect(() => {
    // Request permissions on component mount
    requestPermissions();
    
    // Set up audio recording
    setupAudioRecording();
    
    // Start device scanning
    startDeviceScan();
    
    return () => {
      // Clean up recording and sounds on unmount
      if (recording) {
        stopRecording();
      }
      
      unloadSounds();
      
      // Stop device scanning
      stopDeviceScan();
      
      // Unsubscribe from device events
      if (deviceConnectedSubscription.current) {
        deviceConnectedSubscription.current.remove();
      }
      
      if (deviceDisconnectedSubscription.current) {
        deviceDisconnectedSubscription.current.remove();
      }
      
      if (deviceListChangedSubscription.current) {
        deviceListChangedSubscription.current.remove();
      }
    };
  }, []);

  const startDeviceScan = async () => {
    if (AudioDeviceModule.isAvailable()) {
      try {
        setIsScanning(true);
        
        // Subscribe to device events
        deviceConnectedSubscription.current = AudioDeviceModule.addDeviceConnectedListener(
          device => {
            Alert.alert(
              'Device Connected',
              `${device.name} connected`,
              [{ text: 'OK' }]
            );
            refreshDeviceList();
          }
        );
        
        deviceDisconnectedSubscription.current = AudioDeviceModule.addDeviceDisconnectedListener(
          device => {
            Alert.alert(
              'Device Disconnected',
              `${device.name} disconnected`,
              [{ text: 'OK' }]
            );
            
            // If the disconnected device was selected, reset selection
            if (selectedDevice && selectedDevice.id === device.id) {
              setSelectedDevice(null);
            }
            
            refreshDeviceList();
          }
        );
        
        deviceListChangedSubscription.current = AudioDeviceModule.addDeviceListChangedListener(
          () => refreshDeviceList()
        );
        
        // Start scanning for devices
        await AudioDeviceModule.startDeviceScan();
        
        // Get initial device list
        refreshDeviceList();
      } catch (error) {
        console.error('Error starting device scan:', error);
        Alert.alert('Device Scan Error', 'Failed to start scanning for audio devices.');
      }
    } else {
      console.warn('AudioDeviceModule is not available');
    }
  };
  
  const stopDeviceScan = async () => {
    if (AudioDeviceModule.isAvailable() && isScanning) {
      try {
        await AudioDeviceModule.stopDeviceScan();
        setIsScanning(false);
      } catch (error) {
        console.error('Error stopping device scan:', error);
      }
    }
  };
  
  const refreshDeviceList = async () => {
    if (AudioDeviceModule.isAvailable()) {
      try {
        const devices = await AudioDeviceModule.getAvailableDevices();
        setAudioDevices(devices);
        
        // If no device is selected yet, try to select the default
        if (!selectedDevice) {
          const currentDevice = await AudioDeviceModule.getCurrentDevice();
          if (currentDevice) {
            setSelectedDevice(currentDevice);
          }
        }
      } catch (error) {
        console.error('Error refreshing device list:', error);
      }
    }
  };
  
  const selectAudioDevice = async (device) => {
    if (AudioDeviceModule.isAvailable()) {
      try {
        // Do not allow changing devices during recording
        if (isRecording) {
          Alert.alert('Cannot Change Device', 'Stop recording before changing the input device.');
          return;
        }
        
        const selected = await AudioDeviceModule.selectDevice(device.id);
        setSelectedDevice(selected);
        setDeviceSelectorVisible(false);
        
        // Check if this device supports stereo recording
        const stereoSupported = await AudioDeviceModule.supportsStereoRecording(device.id);
        
        if (!stereoSupported) {
          Alert.alert(
            'Stereo Recording Not Supported',
            'This device may not support stereo recording, which is required for nasal/oral calibration.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error selecting device:', error);
        Alert.alert('Device Selection Error', error.message || 'Failed to select audio device.');
      }
    }
  };

  const unloadSounds = async () => {
    try {
      if (leftSoundRef.current) {
        await leftSoundRef.current.unloadAsync();
        leftSoundRef.current = null;
      }
      
      if (rightSoundRef.current) {
        await rightSoundRef.current.unloadAsync();
        rightSoundRef.current = null;
      }
    } catch (error) {
      console.error("Error unloading sounds:", error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);
        
        if (
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED ||
          grants[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] !== PermissionsAndroid.RESULTS.GRANTED ||
          grants[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert(
            "Permissions Required",
            "This app needs access to your microphone and storage to work properly.",
            [{ text: "OK" }]
          );
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      // iOS permissions
      await Audio.requestPermissionsAsync();
    }
  };

  const setupAudioRecording = async () => {
    try {
      // Use minimal settings to avoid problems
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error("Error setting up audio mode:", error);
    }
  };

  const startRecording = async () => {
    try {
      // Check if a device is selected
      if (!selectedDevice) {
        Alert.alert(
          "No Device Selected",
          "Please select an audio input device before recording.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Clear previous paths and unload sounds
      setRecordingPath(null);
      setLeftChannelPath(null);
      setRightChannelPath(null);
      setCalibrated(false);
      await unloadSounds();
      
      const recordingOptions = {
        android: {
          extension: '.wav', // Using WAV for better compatibility
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 2, // Stereo recording
          bitRate: 128000,
        },
        ios: {
          extension: '.wav', // Using WAV for better compatibility
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 44100,
          numberOfChannels: 2, // Stereo recording
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      console.log("Starting recording with options:", recordingOptions);
      
      const recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync(recordingOptions);
      
      await recordingObject.startAsync();
      setRecording(recordingObject);
      setIsRecording(true);
      
      // Set a timeout to stop recording after 5 seconds for calibration
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 5000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Recording Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = recording.getURI();
      console.log("Recording URI:", uri);
      setRecordingPath(uri);
      
      // Process the recording
      processRecording(uri);
      
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Recording Error", "Failed to stop recording. Please try again.");
    }
  };

  const processRecording = async (uri) => {
    try {
      setProcessingAudio(true);
      
      // For Android, convert the uri path properly
      const filePath = uri.startsWith('file://') ? uri : `file://${uri}`;
      
      console.log("Processing file at path:", filePath);
      
      // Define paths for left and right channels
      const leftPath = `${FileSystem.documentDirectory}left_channel.wav`;
      const rightPath = `${FileSystem.documentDirectory}right_channel.wav`;
      
      console.log("Output paths:", { leftPath, rightPath });
      
      try {
        // In a real app, you would use native modules or a service to split the stereo audio
        // For demonstration purposes, we'll simulate the splitting with a delay
        
        // Simulated channel splitting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Set paths for playback
        setLeftChannelPath(leftPath);
        setRightChannelPath(rightPath);
        
        // Run calibration analysis
        runCalibration();
        
      } catch (readError) {
        console.error("Error processing audio:", readError);
        Alert.alert("Processing Error", "Failed to split audio channels. Please try again.");
      }
      
    } catch (error) {
      console.error("Error processing recording:", error);
      Alert.alert("Processing Error", "Failed to process the recording. Please try again.");
    } finally {
      setProcessingAudio(false);
    }
  };

  const runCalibration = () => {
    // Simulate calibration process
    setCalibrationProgress(0);
    
    // Artificial delay to simulate processing
    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCalibrated(true);
          
          // Load the audio files for playback once calibration is complete
          loadAudioFiles();
          
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const loadAudioFiles = async () => {
    try {
      // Unload any existing sounds
      await unloadSounds();
      
      // Load left channel for playback
      if (leftChannelPath) {
        const { sound } = await Audio.Sound.createAsync({ uri: leftChannelPath });
        leftSoundRef.current = sound;
      }
      
      // Load right channel for playback
      if (rightChannelPath) {
        const { sound } = await Audio.Sound.createAsync({ uri: rightChannelPath });
        rightSoundRef.current = sound;
      }
      
    } catch (error) {
      console.error("Error loading audio files:", error);
      Alert.alert("Playback Error", "Failed to load audio files for playback.");
    }
  };

  const playLeftChannel = async () => {
    try {
      if (!leftSoundRef.current) {
        Alert.alert("Playback Error", "Left channel audio is not available.");
        return;
      }
      
      if (isPlayingLeft) {
        // Stop playback
        await leftSoundRef.current.stopAsync();
        setIsPlayingLeft(false);
      } else {
        // If right channel is playing, stop it
        if (isPlayingRight) {
          await rightSoundRef.current.stopAsync();
          setIsPlayingRight(false);
        }
        
        // Play left channel
        await leftSoundRef.current.setPositionAsync(0); // Reset to beginning
        await leftSoundRef.current.playAsync();
        setIsPlayingLeft(true);
        
        // Set up listener for when playback finishes
        leftSoundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingLeft(false);
          }
        });
      }
    } catch (error) {
      console.error("Error playing left channel:", error);
      Alert.alert("Playback Error", "Failed to play left channel audio.");
    }
  };

  const playRightChannel = async () => {
    try {
      if (!rightSoundRef.current) {
        Alert.alert("Playback Error", "Right channel audio is not available.");
        return;
      }
      
      if (isPlayingRight) {
        // Stop playback
        await rightSoundRef.current.stopAsync();
        setIsPlayingRight(false);
      } else {
        // If left channel is playing, stop it
        if (isPlayingLeft) {
          await leftSoundRef.current.stopAsync();
          setIsPlayingLeft(false);
        }
        
        // Play right channel
        await rightSoundRef.current.setPositionAsync(0); // Reset to beginning
        await rightSoundRef.current.playAsync();
        setIsPlayingRight(true);
        
        // Set up listener for when playback finishes
        rightSoundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingRight(false);
          }
        });
      }
    } catch (error) {
      console.error("Error playing right channel:", error);
      Alert.alert("Playback Error", "Failed to play right channel audio.");
    }
  };

  const renderDeviceItem = ({ item }) => {
    const isSelected = selectedDevice && selectedDevice.id === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          isSelected && styles.deviceItemSelected
        ]}
        onPress={() => selectAudioDevice(item)}
      >
        <View style={styles.deviceIconContainer}>
          {item.type === 'usb' && (
            <Ionicons name="usb" size={20} color={isSelected ? "#fff" : Colors.primary} />
          )}
          {item.type === 'bluetooth' && (
            <Ionicons name="bluetooth" size={20} color={isSelected ? "#fff" : Colors.primary} />
          )}
          {item.type === 'builtin' && (
            <Ionicons name="mic" size={20} color={isSelected ? "#fff" : Colors.primary} />
          )}
          {item.type === 'wired' && (
            <Ionicons name="headset" size={20} color={isSelected ? "#fff" : Colors.primary} />
          )}
          {item.type !== 'usb' && item.type !== 'bluetooth' && 
            item.type !== 'builtin' && item.type !== 'wired' && (
            <Ionicons name="hardware-chip" size={20} color={isSelected ? "#fff" : Colors.primary} />
          )}
        </View>
        
        <View style={styles.deviceInfoContainer}>
          <Text style={[
            styles.deviceName,
            isSelected && styles.deviceNameSelected
          ]}>
            {item.name}
          </Text>
          
          <Text style={[
            styles.deviceType,
            isSelected && styles.deviceTypeSelected
          ]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)} 
            {item.capabilities.stereo ? ' • Stereo' : ' • Mono'}
          </Text>
        </View>
        
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar 
        title="Calibration" 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Device Selection Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Audio Input Device</Text>
          
          {selectedDevice ? (
            <View style={styles.selectedDeviceContainer}>
              <View style={styles.deviceIconLarge}>
                {selectedDevice.type === 'usb' && <Ionicons name="usb" size={24} color="#fff" />}
                {selectedDevice.type === 'bluetooth' && <Ionicons name="bluetooth" size={24} color="#fff" />}
                {selectedDevice.type === 'builtin' && <Ionicons name="mic" size={24} color="#fff" />}
                {selectedDevice.type === 'wired' && <Ionicons name="headset" size={24} color="#fff" />}
                {selectedDevice.type !== 'usb' && selectedDevice.type !== 'bluetooth' && 
                 selectedDevice.type !== 'builtin' && selectedDevice.type !== 'wired' && (
                  <Ionicons name="hardware-chip" size={24} color="#fff" />
                )}
              </View>
              
              <View style={styles.selectedDeviceInfo}>
                <Text style={styles.selectedDeviceName}>{selectedDevice.name}</Text>
                <Text style={styles.selectedDeviceType}>
                  {selectedDevice.type.charAt(0).toUpperCase() + selectedDevice.type.slice(1)} 
                  {selectedDevice.capabilities.stereo ? ' • Stereo' : ' • Mono'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.changeDeviceButton}
                onPress={() => setDeviceSelectorVisible(true)}>
                <Text style={styles.changeDeviceText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.selectDeviceButton}
              onPress={() => setDeviceSelectorVisible(true)}>
              <Ionicons name="hardware-chip-outline" size={20} color="#fff" />
              <Text style={styles.selectDeviceButtonText}>Select Audio Device</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Calibration Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Microphone Calibration</Text>
          
          <Text style={styles.instructions}>
            Please ensure you have selected a stereo input device and place it in a quiet environment.
            The process will record audio for 5 seconds, then split the left and right channels.
          </Text>
          
          {processingAudio ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing audio...</Text>
              
              {calibrationProgress > 0 && (
                <View style={styles.progressContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      {width: `${calibrationProgress}%`}
                    ]} 
                  />
                  <Text style={styles.progressText}>{calibrationProgress}%</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.calibrateButton,
                isRecording ? styles.calibrateButtonRecording : null,
                !selectedDevice && styles.buttonDisabled
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={!selectedDevice}>
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.calibrateButtonText}>
                {isRecording ? "Stop Recording" : "Start Calibration"}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Audio Playback */}
          {calibrated && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Calibration Results</Text>
              
              <View style={styles.calibratedContainer}>
                <Ionicons name="checkmark-circle" size={24} color="green" />
                <Text style={styles.calibratedText}>Calibration Complete</Text>
              </View>
              
              <Text style={styles.playbackTitle}>Channel Playback</Text>
              
              <View style={styles.playbackButtonsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.playButton,
                    isPlayingLeft && styles.playButtonActive
                  ]}
                  onPress={playLeftChannel}>
                  <Ionicons 
                    name={isPlayingLeft ? "pause" : "play"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.playButtonText}>
                    {isPlayingLeft ? "Pause Left" : "Play Left"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.playButton,
                    isPlayingRight && styles.playButtonActive
                  ]}
                  onPress={playRightChannel}>
                  <Ionicons 
                    name={isPlayingRight ? "pause" : "play"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.playButtonText}>
                    {isPlayingRight ? "Pause Right" : "Play Right"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.playbackInfo}>
                Listen to both channels to verify correct microphone placement.
                The left channel should capture nasal sound and the right channel should capture oral sound.
              </Text>
            </View>
          )}
        </View>
        
        {/* Help Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Help</Text>
          <Text style={styles.helpText}>
            This calibration tool will adjust your device for optimal nasality detection.
            For best results:
          </Text>
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>Use the DJI Mic 2 or a similar stereo microphone via USB-C</Text>
          </View>
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>Ensure the environment is quiet during calibration</Text>
          </View>
          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipText}>Position one microphone near the nose and one near the mouth</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Device Selector Modal */}
      <Modal
        visible={deviceSelectorVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeviceSelectorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Audio Device</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setDeviceSelectorVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {audioDevices.length > 0 ? (
              <FlatList
                data={audioDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                contentContainerStyle={styles.deviceListContent}
              />
            ) : (
              <View style={styles.noDevicesContainer}>
                <Ionicons name="alert-circle-outline" size={40} color="#999" />
                <Text style={styles.noDevicesText}>No audio devices found</Text>
                <Text style={styles.noDevicesSubtext}>
                  Connect a USB or Bluetooth audio device and try again
                </Text>
                
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={refreshDeviceList}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.refreshButtonText}>Refresh Devices</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text || '#212529',
  },
  selectDeviceButton: {
    backgroundColor: Colors.primary || '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  selectDeviceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedDeviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  deviceIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary || '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDeviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedDeviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedDeviceType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  changeDeviceButton: {
    backgroundColor: '#e9ecef',
    padding: 8,
    borderRadius: 6,
  },
  changeDeviceText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  calibrateButton: {
    backgroundColor: Colors.primary || '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  calibrateButtonRecording: {
    backgroundColor: '#dc3545',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  calibrateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text || '#212529',
  },
  progressContainer: {
    width: '100%',
    height: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary || '#007bff',
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  resultsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text || '#212529',
  },
  calibratedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#d4edda',
    borderRadius: 8,
  },
  calibratedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#155724',
    marginLeft: 8,
  },
  playbackTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 8,
    color: Colors.text || '#212529',
  },
  playbackButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  playButton: {
    backgroundColor: Colors.primary || '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    flex: 0.48,
  },
  playButtonActive: {
    backgroundColor: '#28a745',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  playbackInfo: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  debugButton: {
    backgroundColor: '#6c757d',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#212529',
  },
  modalCloseButton: {
    padding: 6,
  },
  deviceList: {
    maxHeight: 400,
  },
  deviceListContent: {
    padding: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  deviceItemSelected: {
    backgroundColor: Colors.primary || '#007bff',
  },
  deviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  deviceNameSelected: {
    color: '#fff',
  },
  deviceType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceTypeSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  noDevicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: Colors.primary || '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    width: 150,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  }
});

export default CalibrationScreen;
