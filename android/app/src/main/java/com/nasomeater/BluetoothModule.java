package com.nasomeater;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothHeadset;
import android.bluetooth.BluetoothA2dp;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.lang.reflect.Method;

public class BluetoothModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    private static final String MODULE_NAME = "BluetoothManager";
    private static final String TAG = "NasomeaterBT";

    // BluetoothAdapter for accessing device BT functionality
    private BluetoothAdapter bluetoothAdapter;

    // Bluetooth profiles
    private BluetoothHeadset bluetoothHeadset;
    private BluetoothA2dp bluetoothA2dp;

    // Audio manager for managing audio routing
    private AudioManager audioManager;

    // Context
    private final ReactApplicationContext reactContext;

    // Devices cache
    private final HashMap<String, BluetoothDevice> connectedDevices = new HashMap<>();
    
    // Broadcast receiver for BT events
    private BroadcastReceiver bluetoothReceiver;
    private boolean receiverRegistered = false;

    public BluetoothModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.reactContext.addLifecycleEventListener(this);
        
        // Get Bluetooth adapter
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        
        // Get Audio manager
        audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        
        // Initialize Bluetooth profiles
        initializeBluetoothProfiles();
        
        // Register for Bluetooth events
        registerBluetoothReceiver();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Initialize BT profiles using profile proxies
     */
    private void initializeBluetoothProfiles() {
        if (bluetoothAdapter == null) return;

        // Get a proxy for the headset profile
        bluetoothAdapter.getProfileProxy(reactContext, new BluetoothProfile.ServiceListener() {
            @Override
            public void onServiceConnected(int profile, BluetoothProfile proxy) {
                if (profile == BluetoothProfile.HEADSET) {
                    bluetoothHeadset = (BluetoothHeadset) proxy;
                    Log.d(TAG, "Bluetooth Headset profile connected");
                    
                    // Once connected, emit a list of devices
                    sendConnectedDevicesUpdate();
                }
            }

            @Override
            public void onServiceDisconnected(int profile) {
                if (profile == BluetoothProfile.HEADSET) {
                    bluetoothHeadset = null;
                    Log.d(TAG, "Bluetooth Headset profile disconnected");
                }
            }
        }, BluetoothProfile.HEADSET);

        // Get a proxy for the A2DP profile (advanced audio)
        bluetoothAdapter.getProfileProxy(reactContext, new BluetoothProfile.ServiceListener() {
            @Override
            public void onServiceConnected(int profile, BluetoothProfile proxy) {
                if (profile == BluetoothProfile.A2DP) {
                    bluetoothA2dp = (BluetoothA2dp) proxy;
                    Log.d(TAG, "Bluetooth A2DP profile connected");
                    
                    // Once connected, emit a list of devices
                    sendConnectedDevicesUpdate();
                }
            }

            @Override
            public void onServiceDisconnected(int profile) {
                if (profile == BluetoothProfile.A2DP) {
                    bluetoothA2dp = null;
                    Log.d(TAG, "Bluetooth A2DP profile disconnected");
                }
            }
        }, BluetoothProfile.A2DP);
    }

    /**
     * Register a broadcast receiver for Bluetooth events
     */
    private void registerBluetoothReceiver() {
        if (bluetoothReceiver != null || bluetoothAdapter == null) return;

        bluetoothReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (action == null) return;

                switch (action) {
                    case BluetoothDevice.ACTION_ACL_CONNECTED:
                        BluetoothDevice connectedDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (connectedDevice != null) {
                            Log.d(TAG, "Bluetooth device connected: " + connectedDevice.getName());
                            connectedDevices.put(connectedDevice.getAddress(), connectedDevice);
                            sendDeviceEvent("deviceConnected", connectedDevice);
                        }
                        break;
                        
                    case BluetoothDevice.ACTION_ACL_DISCONNECTED:
                        BluetoothDevice disconnectedDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (disconnectedDevice != null) {
                            Log.d(TAG, "Bluetooth device disconnected: " + disconnectedDevice.getName());
                            connectedDevices.remove(disconnectedDevice.getAddress());
                            sendDeviceEvent("deviceDisconnected", disconnectedDevice);
                        }
                        break;
                        
                    case BluetoothAdapter.ACTION_STATE_CHANGED:
                        int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR);
                        sendBluetoothStateChanged(state);
                        break;
                        
                    case BluetoothDevice.ACTION_BOND_STATE_CHANGED:
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        int bondState = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR);
                        
                        if (bondState == BluetoothDevice.BOND_BONDED && device != null) {
                            Log.d(TAG, "Device bonded (paired): " + device.getName());
                            sendDeviceEvent("devicePaired", device);
                        }
                        break;
                        
                    case AudioManager.ACTION_HEADSET_PLUG:
                        int headsetState = intent.getIntExtra("state", -1);
                        String headsetName = intent.getStringExtra("name");
                        if (headsetState == 1) {
                            Log.d(TAG, "Wired headset connected: " + headsetName);
                            sendHeadsetPlugEvent(true, headsetName);
                        } else if (headsetState == 0) {
                            Log.d(TAG, "Wired headset disconnected");
                            sendHeadsetPlugEvent(false, headsetName);
                        }
                        break;
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
        filter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
        filter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        filter.addAction(AudioManager.ACTION_HEADSET_PLUG);
        
        reactContext.registerReceiver(bluetoothReceiver, filter);
        receiverRegistered = true;
        Log.d(TAG, "Bluetooth broadcast receiver registered");
    }

    private void unregisterBluetoothReceiver() {
        if (bluetoothReceiver != null && receiverRegistered) {
            try {
                reactContext.unregisterReceiver(bluetoothReceiver);
                receiverRegistered = false;
                Log.d(TAG, "Bluetooth broadcast receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering bluetooth receiver: " + e.getMessage());
            }
        }
    }

    // Utility function to convert a BluetoothDevice to a WritableMap for React
    private WritableMap deviceToWritableMap(BluetoothDevice device) {
        WritableMap deviceMap = Arguments.createMap();
        if (device != null) {
            deviceMap.putString("id", device.getAddress());
            deviceMap.putString("name", device.getName() != null ? device.getName() : "Unknown Device");
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                deviceMap.putInt("bondState", device.getBondState());
                deviceMap.putString("type", getDeviceTypeName(device));
                
                // Check connection state
                boolean isConnected = isDeviceConnected(device);
                deviceMap.putBoolean("isConnected", isConnected);
                
                // Check if it's an audio device
                boolean isMicrophone = isAudioDevice(device);
                deviceMap.putBoolean("isMicrophone", isMicrophone);
            } else {
                deviceMap.putInt("bondState", BluetoothDevice.BOND_NONE);
                deviceMap.putString("type", "unknown");
                deviceMap.putBoolean("isConnected", false);
                deviceMap.putBoolean("isMicrophone", false);
            }
        }
        return deviceMap;
    }

    private String getDeviceTypeName(BluetoothDevice device) {
        if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            return "unknown";
        }
        
        int type = device.getType();
        switch (type) {
            case BluetoothDevice.DEVICE_TYPE_CLASSIC:
                return "classic";
            case BluetoothDevice.DEVICE_TYPE_LE:
                return "le";
            case BluetoothDevice.DEVICE_TYPE_DUAL:
                return "dual";
            default:
                return "unknown";
        }
    }

    private boolean isDeviceConnected(BluetoothDevice device) {
        if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        
        if (bluetoothHeadset != null) {
            List<BluetoothDevice> connectedHeadsets = bluetoothHeadset.getConnectedDevices();
            if (connectedHeadsets.contains(device)) {
                return true;
            }
        }
        
        if (bluetoothA2dp != null) {
            List<BluetoothDevice> connectedA2dpDevices = bluetoothA2dp.getConnectedDevices();
            if (connectedA2dpDevices.contains(device)) {
                return true;
            }
        }
        
        return false;
    }

    private boolean isAudioDevice(BluetoothDevice device) {
        if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        
        // Check if device is an audio device by checking the profiles
        if (bluetoothHeadset != null) {
            List<BluetoothDevice> headsetDevices = bluetoothHeadset.getConnectedDevices();
            if (headsetDevices.contains(device)) {
                return true;
            }
        }
        
        if (bluetoothA2dp != null) {
            List<BluetoothDevice> a2dpDevices = bluetoothA2dp.getConnectedDevices();
            if (a2dpDevices.contains(device)) {
                return true;
            }
        }
        
        return false;
    }

    private void sendDeviceEvent(String eventName, BluetoothDevice device) {
        WritableMap deviceMap = deviceToWritableMap(device);
        sendEvent(reactContext, eventName, deviceMap);
    }

    private void sendBluetoothStateChanged(int state) {
        String stateString;
        
        switch (state) {
            case BluetoothAdapter.STATE_ON:
                stateString = "PoweredOn";
                break;
            case BluetoothAdapter.STATE_OFF:
                stateString = "PoweredOff";
                break;
            case BluetoothAdapter.STATE_TURNING_ON:
                stateString = "PoweringOn";
                break;
            case BluetoothAdapter.STATE_TURNING_OFF:
                stateString = "PoweringOff";
                break;
            default:
                stateString = "Unknown";
                break;
        }
        
        WritableMap params = Arguments.createMap();
        params.putString("state", stateString);
        sendEvent(reactContext, "bluetoothStateChanged", params);
    }

    private void sendHeadsetPlugEvent(boolean connected, String name) {
        WritableMap params = Arguments.createMap();
        params.putBoolean("connected", connected);
        params.putString("name", name != null ? name : "Unknown Headset");
        sendEvent(reactContext, "headsetPlugStateChanged", params);
    }

    private void sendConnectedDevicesUpdate() {
        WritableArray devices = Arguments.createArray();
        
        try {
            // Get currently connected devices
            List<BluetoothDevice> connectedDevicesList = new ArrayList<>();
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                // Check headset profile for connected devices
                if (bluetoothHeadset != null) {
                    List<BluetoothDevice> headsetDevices = bluetoothHeadset.getConnectedDevices();
                    for (BluetoothDevice device : headsetDevices) {
                        if (!connectedDevicesList.contains(device)) {
                            connectedDevicesList.add(device);
                            connectedDevices.put(device.getAddress(), device);
                        }
                    }
                }
                
                // Check A2DP profile for connected devices
                if (bluetoothA2dp != null) {
                    List<BluetoothDevice> a2dpDevices = bluetoothA2dp.getConnectedDevices();
                    for (BluetoothDevice device : a2dpDevices) {
                        if (!connectedDevicesList.contains(device)) {
                            connectedDevicesList.add(device);
                            connectedDevices.put(device.getAddress(), device);
                        }
                    }
                }
            }
            
            // Convert to array of device maps
            for (BluetoothDevice device : connectedDevicesList) {
                WritableMap deviceMap = deviceToWritableMap(device);
                devices.pushMap(deviceMap);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting connected devices: " + e.getMessage());
        }
        
        // Send event with connected devices list
        sendEvent(reactContext, "connectedDevicesChanged", devices);
    }

    private void sendEvent(ReactContext reactContext, String eventName, @Nullable Object params) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    /**
     * Check if Bluetooth is supported and enabled
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void isBluetoothEnabled(Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.resolve(false);
                return;
            }
            
            boolean enabled = bluetoothAdapter.isEnabled();
            promise.resolve(enabled);
        } catch (Exception e) {
            promise.reject("ERR_BLUETOOTH", "Could not check Bluetooth state: " + e.getMessage());
        }
    }

    /**
     * Get the current state of Bluetooth
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getBluetoothState(Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.resolve("Unsupported");
                return;
            }
            
            if (bluetoothAdapter.isEnabled()) {
                promise.resolve("PoweredOn");
            } else {
                promise.resolve("PoweredOff");
            }
        } catch (Exception e) {
            promise.reject("ERR_BLUETOOTH", "Could not get Bluetooth state: " + e.getMessage());
        }
    }

    /**
     * Request to enable Bluetooth
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void enableBluetooth(Promise promise) {
        if (bluetoothAdapter == null) {
            promise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is not supported on this device");
            return;
        }
        
        if (bluetoothAdapter.isEnabled()) {
            promise.resolve(true);
            return;
        }
        
        try {
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            boolean success = bluetoothAdapter.enable();
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("ERR_ENABLE_BLUETOOTH", "Could not enable Bluetooth: " + e.getMessage());
        }
    }

    /**
     * Get a list of all paired devices
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getPairedDevices(Promise promise) {
        if (bluetoothAdapter == null) {
            promise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is not supported on this device");
            return;
        }
        
        try {
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            WritableArray deviceArray = Arguments.createArray();
            
            for (BluetoothDevice device : pairedDevices) {
                WritableMap deviceMap = deviceToWritableMap(device);
                deviceArray.pushMap(deviceMap);
            }
            
            promise.resolve(deviceArray);
        } catch (Exception e) {
            promise.reject("ERR_GET_PAIRED_DEVICES", "Could not get paired devices: " + e.getMessage());
        }
    }

    /**
     * Get a list of connected Bluetooth devices across profiles
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getConnectedDevices(Promise promise) {
        try {
            WritableArray deviceArray = Arguments.createArray();
            List<BluetoothDevice> connectedDevicesList = new ArrayList<>();
            
            if (bluetoothAdapter == null) {
                promise.resolve(deviceArray);
                return;
            }
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            // Get headset profile devices
            if (bluetoothHeadset != null) {
                List<BluetoothDevice> headsetDevices = bluetoothHeadset.getConnectedDevices();
                for (BluetoothDevice device : headsetDevices) {
                    if (!connectedDevicesList.contains(device)) {
                        connectedDevicesList.add(device);
                    }
                }
            }
            
            // Get A2DP profile devices
            if (bluetoothA2dp != null) {
                List<BluetoothDevice> a2dpDevices = bluetoothA2dp.getConnectedDevices();
                for (BluetoothDevice device : a2dpDevices) {
                    if (!connectedDevicesList.contains(device)) {
                        connectedDevicesList.add(device);
                    }
                }
            }
            
            // Add to result array
            for (BluetoothDevice device : connectedDevicesList) {
                WritableMap deviceMap = deviceToWritableMap(device);
                deviceArray.pushMap(deviceMap);
            }
            
            promise.resolve(deviceArray);
        } catch (Exception e) {
            promise.reject("ERR_GET_CONNECTED_DEVICES", "Could not get connected devices: " + e.getMessage());
        }
    }

    /**
     * Check if a specific device is connected
     * @param deviceId The Bluetooth address of the device
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void isDeviceConnected(String deviceId, Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.resolve(false);
                return;
            }
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceId);
            boolean isConnected = isDeviceConnected(device);
            promise.resolve(isConnected);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    /**
     * Open system Bluetooth settings
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void openBluetoothSettings(Promise promise) {
        try {
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERR_OPEN_SETTINGS", "Could not open Bluetooth settings: " + e.getMessage());
        }
    }

    /**
     * Check if a device is paired/bonded at the system level
     * @param deviceId The Bluetooth address of the device
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void isDevicePaired(String deviceId, Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.resolve(false);
                return;
            }
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceId);
            boolean isPaired = device.getBondState() == BluetoothDevice.BOND_BONDED;
            promise.resolve(isPaired);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    /**
     * Initiate pairing with a device using reflection (may not work on all devices)
     * @param deviceId The Bluetooth address of the device
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void pairDevice(String deviceId, Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is not supported on this device");
                return;
            }
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceId);
            
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) {
                // Already paired
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", true);
                result.putString("message", "Device already paired");
                promise.resolve(result);
                return;
            }
            
            // Try to initiate pairing through reflection
            try {
                Method method = device.getClass().getMethod("createBond");
                boolean started = (boolean) method.invoke(device);
                
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", started);
                if (started) {
                    result.putString("message", "Pairing initiated");
                } else {
                    result.putString("message", "Failed to initiate pairing");
                }
                promise.resolve(result);
            } catch (Exception e) {
                WritableMap result = Arguments.createMap();
                result.putBoolean("success", false);
                result.putString("error", "Failed to pair: " + e.getMessage());
                promise.resolve(result);
            }
            
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", "Failed to pair: " + e.getMessage());
            promise.resolve(result);
        }
    }

    /**
     * Request to use a specific audio device for recording
     * @param deviceId The Bluetooth address of the device
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void requestAudioDevice(String deviceId, Promise promise) {
        try {
            if (bluetoothAdapter == null) {
                promise.reject("ERR_BLUETOOTH_UNSUPPORTED", "Bluetooth is not supported on this device");
                return;
            }
            
            if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                promise.reject("ERR_PERMISSION", "Bluetooth permission not granted");
                return;
            }
            
            if (!bluetoothAdapter.isEnabled()) {
                promise.reject("ERR_BLUETOOTH_DISABLED", "Bluetooth is disabled");
                return;
            }
            
            // Check if device is connected
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceId);
            boolean isConnected = isDeviceConnected(device);
            
            if (!isConnected) {
                promise.reject("ERR_DEVICE_DISCONNECTED", "Device is not connected");
                return;
            }
            
            // Check if this is an audio device
            boolean isAudio = isAudioDevice(device);
            
            if (!isAudio) {
                promise.reject("ERR_NOT_AUDIO_DEVICE", "Device is not an audio device");
                return;
            }
            
            // Try to set it as the audio device
            // Note: Android automatically routes audio to connected BT headsets,
            // so we're just checking if it's properly set
            
            boolean isBluetoothScoOn = audioManager.isBluetoothScoOn();
            if (!isBluetoothScoOn) {
                audioManager.startBluetoothSco();
                audioManager.setBluetoothScoOn(true);
            }
            
            promise.resolve(true);
            
        } catch (Exception e) {
            promise.reject("ERR_REQUEST_AUDIO_DEVICE", "Could not request audio device: " + e.getMessage());
        }
    }

    /**
     * Return active audio devices
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getActiveAudioDevices(Promise promise) {
        try {
            WritableArray devices = Arguments.createArray();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] audioDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                
                for (AudioDeviceInfo deviceInfo : audioDevices) {
                    WritableMap deviceMap = Arguments.createMap();
                    deviceMap.putString("id", String.valueOf(deviceInfo.getId()));
                    deviceMap.putString("name", deviceInfo.getProductName().toString());
                    deviceMap.putInt("type", deviceInfo.getType());
                    deviceMap.putBoolean("isConnected", true);
                    
                    devices.pushMap(deviceMap);
                }
            }
            
            promise.resolve(devices);
        } catch (Exception e) {
            promise.reject("ERR_GET_AUDIO_DEVICES", "Could not get audio devices: " + e.getMessage());
        }
    }

    @Override
    public void onHostResume() {
        // Register receiver if not already registered
        if (!receiverRegistered) {
            registerBluetoothReceiver();
        }
        
        // Update connected devices
        sendConnectedDevicesUpdate();
    }

    @Override
    public void onHostPause() {
        // No need to unregister receiver on pause
    }

    @Override
    public void onHostDestroy() {
        // Cleanup on module destroy
        unregisterBluetoothReceiver();
        
        // Clean up profile proxies
        if (bluetoothAdapter != null) {
            if (bluetoothHeadset != null) {
                bluetoothAdapter.closeProfileProxy(BluetoothProfile.HEADSET, bluetoothHeadset);
                bluetoothHeadset = null;
            }
            
            if (bluetoothA2dp != null) {
                bluetoothAdapter.closeProfileProxy(BluetoothProfile.A2DP, bluetoothA2dp);
                bluetoothA2dp = null;
            }
        }
    }
    
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("BOND_NONE", BluetoothDevice.BOND_NONE);
        constants.put("BOND_BONDING", BluetoothDevice.BOND_BONDING);
        constants.put("BOND_BONDED", BluetoothDevice.BOND_BONDED);
        return constants;
    }
}
