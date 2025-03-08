import React, { useState, useEffect } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import BleManager from '../utils/BluetoothManager';

// Simplified MicStatusCard without nesting
const MicStatusCard = ({ title, device }) => {
  const isConnected = !!device;
  
  return (
    <View style={[
      styles.card, 
      isConnected ? styles.connectedCard : styles.disconnectedCard
    ]}>
      <Text style={styles.cardTitle}>{title}</Text>
      
      {isConnected ? (
        <Text style={styles.connectedText}>
          <Ionicons name="bluetooth" size={14} color="#4caf50" />
          {' ' + device.name}
        </Text>
      ) : (
        <Text style={styles.disconnectedText}>Not Connected</Text>
      )}
    </View>
  );
};

const CalibrationScreen = ({ navigation, route }) => {
  const [nasalMic, setNasalMic] = useState(null);
  const [oralMic, setOralMic] = useState(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Component mount
  useEffect(() => {
    checkPermissionsAndInitialize();
    
    // Add device connection listener
    const deviceListener = BleManager.addListener('connectedDevicesChanged', (devices) => {
      updateConnectedDevices(devices);
    });
    
    // Clean up
    return () => {
      deviceListener.remove();
    };
  }, []);
  
  // Request permissions and initialize Bluetooth
  const checkPermissionsAndInitialize = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        ]);
        
        const hasPermissions = 
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted';
          
        if (!hasPermissions) {
          Alert.alert(
            "Permissions Required",
            "Bluetooth permissions are needed to detect connected devices."
          );
          setLoading(false);
          return;
        }
      }
      
      // Initialize Bluetooth
      await BleManager.initialize();
      
      // Check if Bluetooth is enabled
      const isEnabled = await BleManager.isBluetoothEnabled();
      setBluetoothEnabled(isEnabled);
      
      if (isEnabled) {
        // Get connected devices
        const devices = await BleManager.getConnectedDevices();
        updateConnectedDevices(devices);
      } else {
        setConnectedDevices([]);
      }
    } catch (error) {
      console.error("Error initializing Bluetooth:", error);
      setConnectedDevices([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Update connected devices list
  const updateConnectedDevices = (devices) => {
    setConnectedDevices(devices || []);
  };
  
  // Handle opening Bluetooth settings
  const openBluetoothSettings = async () => {
    try {
      await BleManager.openBluetoothSettings();
      // After returning from settings, re-check Bluetooth status
      setTimeout(() => {
        checkPermissionsAndInitialize();
      }, 1000);
    } catch (error) {
      console.error("Error opening Bluetooth settings:", error);
      Alert.alert("Error", "Unable to open Bluetooth settings. Please enable Bluetooth manually.");
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleProceedToTest = () => {
    if (!nasalMic || !oralMic) {
      Alert.alert(
        "Devices Required",
        "Please assign both nasal and oral microphones before proceeding to testing."
      );
      return;
    }

    const patient = route.params?.patient;
    navigation.navigate('Test', { 
      patient, 
      nasalMic, 
      oralMic 
    });
  };

  // Create device item component
  const renderDeviceItem = (device) => (
    <TouchableOpacity 
      key={device.id}
      style={styles.deviceItem} 
      onPress={() => {
        Alert.alert(
          "Assign Device",
          `Assign "${device.name}" as:`,
          [
            {
              text: "Nasal Microphone",
              onPress: () => {
                if (oralMic && oralMic.id === device.id) {
                  Alert.alert("Already Assigned", "This device is already assigned as Oral Microphone");
                  return;
                }
                setNasalMic(device);
              }
            },
            {
              text: "Oral Microphone",
              onPress: () => {
                if (nasalMic && nasalMic.id === device.id) {
                  Alert.alert("Already Assigned", "This device is already assigned as Nasal Microphone");
                  return;
                }
                setOralMic(device);
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      }}
    >
      <View>
        <Text style={styles.deviceName}>{device.name || "Unknown Device"}</Text>
        <Text style={styles.deviceId}>{device.id}</Text>
        <Text style={styles.connectedBadgeText}>Connected</Text>
      </View>
      
      <View style={styles.assignButton}>
        <Text style={styles.assignButtonText}>Assign</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar 
        title="Device Setup"
        onBack={handleBack}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Connected Bluetooth Devices</Text>
        
        {!bluetoothEnabled && (
          <TouchableOpacity 
            style={styles.bluetoothAlertContainer}
            onPress={openBluetoothSettings}
          >
            <Ionicons name="bluetooth-off" size={20} color="#ff6b6b" />
            <Text style={styles.bluetoothAlertText}>
              Bluetooth is disabled. Tap to enable Bluetooth
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#ff6b6b" />
          </TouchableOpacity>
        )}
        
        {bluetoothEnabled && (
          <Text style={styles.infoText}>
            Select a device from this list to assign it as a microphone.
          </Text>
        )}
        
        {/* Device list */}
        <View style={styles.devicesList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.lightNavalBlue} />
              <Text style={styles.loadingText}>Scanning for devices...</Text>
            </View>
          ) : connectedDevices.length > 0 ? (
            connectedDevices.map(renderDeviceItem)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bluetooth" size={32} color="#999" />
              <Text style={styles.emptyStateText}>
                No Bluetooth devices connected
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Please connect Bluetooth devices to your device
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={checkPermissionsAndInitialize}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Text style={styles.sectionTitle}>Assigned Microphones</Text>
        
        <MicStatusCard 
          title="Nasal Microphone" 
          device={nasalMic}
        />
        
        <MicStatusCard 
          title="Oral Microphone" 
          device={oralMic}
        />

        <TouchableOpacity 
          style={[
            styles.proceedButton,
            (!nasalMic || !oralMic) ? styles.disabledButton : {}
          ]} 
          onPress={handleProceedToTest}
          disabled={!nasalMic || !oralMic}
        >
          <Text style={styles.proceedButtonText}>Proceed to Testing</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.lightNavalBlue,
    marginBottom: 10,
  },
  infoText: {
    color: '#666',
    marginBottom: 16,
    backgroundColor: '#e1f5fe',
    padding: 10,
    borderRadius: 8,
  },
  devicesList: {
    marginBottom: 20,
    minHeight: 120,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e8f5e9',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  connectedBadgeText: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  assignButton: {
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.lightNavalBlue,
    marginBottom: 10,
    marginTop: 10,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  disconnectedCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  connectedCard: {
    backgroundColor: '#f1f8e9',
    borderColor: '#c5e1a5',
  },
  connectedText: {
    color: '#4caf50',
    fontSize: 15,
    fontWeight: '500',
  },
  disconnectedText: {
    color: '#999',
    fontSize: 15,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  bluetoothAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bluetoothAlertText: {
    flex: 1,
    color: '#e53935',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
    borderRadius: 8,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default CalibrationScreen;
