package com.jasperdoan.nasomEATR.audiodevice;

import android.app.PendingIntent;
import android.content.Context;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.os.Build;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.BufferedOutputStream;
import java.io.DataOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.ShortBuffer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class EnhancedAudioModule extends ReactContextBaseJavaModule {
    private static final String TAG = "EnhancedAudioModule";
    private static final String E_RECORDING_ERROR = "E_RECORDING_ERROR";
    private static final String E_PROCESSING_ERROR = "E_PROCESSING_ERROR";
    
    // Audio format constants
    private static final int SAMPLE_RATE = 44100;  // 44.1 kHz
    private static final int BITS_PER_SAMPLE = 16; // 16 bits
    private static final int STEREO_CHANNELS = 2;  // Stereo
    private static final int MONO_CHANNELS = 1;    // Mono
    
    private final ReactApplicationContext reactContext;
    private AudioManager audioManager;
    private UsbManager usbManager;
    private AudioDeviceInfo selectedDevice = null;
    private boolean isScanning = false;
    private BroadcastReceiver usbReceiver;
    
    // Audio recording variables
    private boolean isRecording = false;
    private AudioRecord audioRecord = null;
    private Thread recordingThread = null;
    private int bufferSize = 0;
    private String recordingFilePath = null;
    private Executor audioProcessingExecutor = Executors.newSingleThreadExecutor();

    private static final String ACTION_USB_PERMISSION = "com.jasperdoan.nasomEATR.USB_PERMISSION";
    private String pendingDeviceId = null;
    private Promise pendingPromise = null;

    public EnhancedAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        this.usbManager = (UsbManager) reactContext.getSystemService(Context.USB_SERVICE);
        
        // Create USB broadcast receiver
        setupUsbReceiver();
        registerUsbPermissionReceiver();
    }

    @Override
    public String getName() {
        return "EnhancedAudioModule";
    }

    /**
     * Helper method to normalize file paths by removing "file://" prefix if present
     */
    private String normalizeFilePath(String path) {
        if (path == null) return null;
        if (path.startsWith("file://")) {
            return path.substring(7);
        }
        return path;
    }
    
    /**
     * Ensure the file has a .wav extension
     */
    private String ensureWavExtension(String path) {
        if (path == null) return null;
        if (!path.toLowerCase().endsWith(".wav")) {
            return path.replaceAll("\\.[^.]*$", "") + ".wav";
        }
        return path;
    }
    
    /**
     * Write a WAV header to the output stream
     */
    private void writeWavHeader(FileOutputStream out, int channels, int sampleRate, 
                               int bitsPerSample, int audioLength) throws IOException {
        // WAV header structure
        
        // RIFF header
        out.write("RIFF".getBytes()); // ChunkID
        out.write(intToByteArray(36 + audioLength)); // ChunkSize
        out.write("WAVE".getBytes()); // Format
        
        // fmt subchunk
        out.write("fmt ".getBytes()); // Subchunk1ID
        out.write(intToByteArray(16)); // Subchunk1Size (16 for PCM)
        out.write(shortToByteArray((short) 1)); // AudioFormat (1 for PCM)
        out.write(shortToByteArray((short) channels)); // NumChannels
        out.write(intToByteArray(sampleRate)); // SampleRate
        out.write(intToByteArray(sampleRate * channels * bitsPerSample / 8)); // ByteRate
        out.write(shortToByteArray((short) (channels * bitsPerSample / 8))); // BlockAlign
        out.write(shortToByteArray((short) bitsPerSample)); // BitsPerSample
        
        // data subchunk
        out.write("data".getBytes()); // Subchunk2ID
        out.write(intToByteArray(audioLength)); // Subchunk2Size
    }

    /**
     * Convert an integer to a little-endian byte array
     */
    private byte[] intToByteArray(int value) {
        byte[] result = new byte[4];
        result[0] = (byte) (value & 0xFF);
        result[1] = (byte) ((value >> 8) & 0xFF);
        result[2] = (byte) ((value >> 16) & 0xFF);
        result[3] = (byte) ((value >> 24) & 0xFF);
        return result;
    }

    /**
     * Convert a short to a little-endian byte array
     */
    private byte[] shortToByteArray(short value) {
        byte[] result = new byte[2];
        result[0] = (byte) (value & 0xFF);
        result[1] = (byte) ((value >> 8) & 0xFF);
        return result;
    }

    private void setupUsbReceiver() {
        usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                
                if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (isAudioDevice(device)) {
                        sendDeviceEvent("onDeviceConnected", deviceToMap(device));
                        sendDeviceListChanged();
                    }
                } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (isAudioDevice(device)) {
                        sendDeviceEvent("onDeviceDisconnected", deviceToMap(device));
                        sendDeviceListChanged();
                    }
                }
            }
        };
    }

    private void registerUsbPermissionReceiver() {
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        BroadcastReceiver usbPermissionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (ACTION_USB_PERMISSION.equals(action)) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                    
                    if (granted && device != null && pendingPromise != null) {
                        pendingPromise.resolve(deviceToMap(device));
                    } else if (pendingPromise != null) {
                        pendingPromise.reject("PERMISSION_DENIED", "User denied USB device permission");
                    }
                    
                    pendingDeviceId = null;
                    pendingPromise = null;
                }
            }
        };
        
        // Add the required export flag
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(usbPermissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            reactContext.registerReceiver(usbPermissionReceiver, filter);
        }
    }

    private boolean isAudioDevice(UsbDevice device) {
        // Special handling for DJI devices
        if (device.getManufacturerName() != null && 
            device.getManufacturerName().toLowerCase().contains("dji")) {
            return true;
        }
        
        // USB classes: https://www.usb.org/defined-class-codes
        // Audio class: 0x01
        return device.getDeviceClass() == 0x01 || 
               (device.getInterfaceCount() > 0 && device.getInterface(0).getInterfaceClass() == 0x01);
    }

    private void registerUsbReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        
        // Add the required export flag
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            reactContext.registerReceiver(usbReceiver, filter);
        }
    }

    private void unregisterUsbReceiver() {
        try {
            reactContext.unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            // Receiver might not be registered
        }
    }

    private void sendDeviceEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    private void sendDeviceListChanged() {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("onDeviceListChanged", null);
    }

    private WritableMap deviceToMap(UsbDevice device) {
        WritableMap deviceMap = Arguments.createMap();
        deviceMap.putString("id", String.valueOf(device.getDeviceId()));
        
        String name = device.getProductName() != null ? 
                     device.getProductName().toString() : 
                     "USB Audio Device " + device.getDeviceId();
                     
        // Special handling for DJI devices to ensure they're properly identified
        boolean isDJI = false;
        if (device.getManufacturerName() != null && 
            device.getManufacturerName().toLowerCase().contains("dji")) {
            isDJI = true;
            if (!name.contains("DJI") && !name.contains("Mic")) {
                name = "DJI Mic " + name;
            }
        }
        
        deviceMap.putString("name", name);
        deviceMap.putString("type", "usb");
        deviceMap.putBoolean("isDefault", false);

        WritableMap capabilities = Arguments.createMap();
        // Force DJI devices to be recognized as stereo
        capabilities.putBoolean("stereo", isDJI || true); // Assume USB audio devices support stereo
        WritableArray sampleRates = Arguments.createArray();
        sampleRates.pushInt(44100);
        sampleRates.pushInt(48000);
        capabilities.putArray("sampleRates", sampleRates);
        capabilities.putInt("channelCount", isDJI ? 2 : 2); // Force DJI to have 2 channels
        
        deviceMap.putMap("capabilities", capabilities);
        
        return deviceMap;
    }

    private WritableMap audioDeviceInfoToMap(AudioDeviceInfo device) {
        WritableMap deviceMap = Arguments.createMap();
        deviceMap.putString("id", String.valueOf(device.getId()));
        
        String name = device.getProductName() != null ? 
                     device.getProductName().toString() : 
                     "Audio Device " + device.getId();
                    
        // Special handling for DJI devices
        boolean isDJI = false;
        if (name.toLowerCase().contains("dji")) {
            isDJI = true;
        }
        
        deviceMap.putString("name", name);
        
        String type = "unknown";
        switch (device.getType()) {
            case AudioDeviceInfo.TYPE_BUILTIN_MIC:
                type = "builtin";
                break;
            case AudioDeviceInfo.TYPE_USB_DEVICE:
            case AudioDeviceInfo.TYPE_USB_HEADSET:
                type = "usb";
                break;
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP:
                type = "bluetooth";
                break;
            case AudioDeviceInfo.TYPE_WIRED_HEADSET:
                type = "wired";
                break;
        }
        deviceMap.putString("type", type);
        
        deviceMap.putBoolean("isDefault", false); // Need to check with audio manager
        
        WritableMap capabilities = Arguments.createMap();
        
        // Force DJI devices to be recognized as stereo
        boolean supportsStereo = isDJI || (device.getChannelCounts().length > 0 && 
                              device.getChannelCounts()[0] >= 2);
        capabilities.putBoolean("stereo", supportsStereo);
        
        WritableArray sampleRates = Arguments.createArray();
        for (int rate : device.getSampleRates()) {
            sampleRates.pushInt(rate);
        }
        capabilities.putArray("sampleRates", sampleRates);
        
        int maxChannels = 0;
        for (int channelCount : device.getChannelCounts()) {
            maxChannels = Math.max(maxChannels, channelCount);
        }
        // Ensure DJI devices are at least 2 channels
        capabilities.putInt("channelCount", isDJI ? Math.max(2, maxChannels) : maxChannels);
        
        deviceMap.putMap("capabilities", capabilities);
        
        return deviceMap;
    }

    @ReactMethod
    public void startDeviceScan(Promise promise) {
        if (isScanning) {
            promise.resolve(true);
            return;
        }
        
        try {
            registerUsbReceiver();
            isScanning = true;
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to start device scan: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopDeviceScan(Promise promise) {
        if (!isScanning) {
            promise.resolve(true);
            return;
        }
        
        try {
            unregisterUsbReceiver();
            isScanning = false;
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to stop device scan: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getAvailableDevices(Promise promise) {
        try {
            WritableArray deviceArray = Arguments.createArray();
            
            // Get audio devices if on Android M or higher
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                for (AudioDeviceInfo device : devices) {
                    deviceArray.pushMap(audioDeviceInfoToMap(device));
                }
            }
            
            // Get USB devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (isAudioDevice(device)) {
                    deviceArray.pushMap(deviceToMap(device));
                }
            }
            
            promise.resolve(deviceArray);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get available devices: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getCurrentDevice(Promise promise) {
        if (selectedDevice != null) {
            promise.resolve(audioDeviceInfoToMap(selectedDevice));
        } else {
            promise.resolve(null);
        }
    }

    @ReactMethod
    public void selectDevice(String deviceId, Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                
                for (AudioDeviceInfo device : devices) {
                    if (String.valueOf(device.getId()).equals(deviceId)) {
                        selectedDevice = device;
                        
                        // On Android 10+ we can actually select the device
                        if (Build.VERSION.SDK_INT >= 29) { // Android Q
                            try {
                                // Use reflection to call the method to avoid compilation issues on lower API levels
                                audioManager.getClass()
                                    .getMethod("setPreferredDevice", AudioDeviceInfo.class)
                                    .invoke(audioManager, device);
                            } catch (Exception e) {
                                // Fallback if method not available
                                // Just log the error and continue
                                e.printStackTrace();
                            }
                        }
                        
                        promise.resolve(audioDeviceInfoToMap(device));
                        return;
                    }
                }
            }
            
            // Check USB devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (String.valueOf(device.getDeviceId()).equals(deviceId) && isAudioDevice(device)) {
                    // Request permission to access USB device if needed
                    if (!usbManager.hasPermission(device)) {
                        // Create a PendingIntent for permission request
                        int flags = 0;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            flags = PendingIntent.FLAG_IMMUTABLE;
                        }
                        
                        PendingIntent permissionIntent = PendingIntent.getBroadcast(
                            reactContext,
                            0,
                            new Intent(ACTION_USB_PERMISSION),
                            flags
                        );
                        
                        // Store the promise for later resolution
                        pendingPromise = promise;
                        pendingDeviceId = deviceId;
                        
                        // Request the permission
                        usbManager.requestPermission(device, permissionIntent);
                        
                        // The promise will be resolved in the permission broadcast receiver
                        return;
                    }
                    
                    // We don't have an AudioDeviceInfo for USB devices directly
                    // So we'll need to handle this specially in the recording function
                    selectedDevice = null; // Clear any previous AudioDeviceInfo
                    
                    promise.resolve(deviceToMap(device));
                    return;
                }
            }
            
            promise.reject("DEVICE_NOT_FOUND", "Could not find device with ID: " + deviceId);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to select device: " + e.getMessage());
        }
    }

    @ReactMethod
    public void resetToDefaultDevice(Promise promise) {
        try {
            selectedDevice = null;
            
            if (Build.VERSION.SDK_INT >= 29) { // Android Q
                try {
                    // Use reflection to call the method to avoid compilation issues on lower API levels
                    audioManager.getClass()
                        .getMethod("clearPreferredDevice")
                        .invoke(audioManager);
                } catch (Exception e) {
                    // Fallback if method not available
                    // Just log the error and continue
                    e.printStackTrace();
                }
            }
            
            // Return the current default device
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                if (devices.length > 0) {
                    // First device is typically the default
                    selectedDevice = devices[0];
                    promise.resolve(audioDeviceInfoToMap(devices[0]));
                    return;
                }
            }
            
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to reset to default device: " + e.getMessage());
        }
    }

    @ReactMethod
    public void supportsStereoRecording(String deviceId, Promise promise) {
        try {
            // Special case for DJI devices
            if (deviceId.toLowerCase().contains("dji")) {
                promise.resolve(true);
                return;
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS);
                
                for (AudioDeviceInfo device : devices) {
                    if (String.valueOf(device.getId()).equals(deviceId)) {
                        for (int channelCount : device.getChannelCounts()) {
                            if (channelCount >= 2) {
                                promise.resolve(true);
                                return;
                            }
                        }
                        promise.resolve(false);
                        return;
                    }
                }
            }
            
            // For USB devices, assume they support stereo if they're audio devices
            HashMap<String, UsbDevice> usbDevices = usbManager.getDeviceList();
            for (UsbDevice device : usbDevices.values()) {
                if (String.valueOf(device.getDeviceId()).equals(deviceId) && isAudioDevice(device)) {
                    promise.resolve(true);
                    return;
                }
            }
            
            promise.reject("DEVICE_NOT_FOUND", "Could not find device with ID: " + deviceId);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check stereo support: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void startRecording(String filePath, Promise promise) {
        if (isRecording) {
            promise.reject(E_RECORDING_ERROR, "Already recording");
            return;
        }
        
        try {
            // Normalize the file path and ensure WAV extension
            String normalizedPath = normalizeFilePath(filePath);
            normalizedPath = ensureWavExtension(normalizedPath);
            
            Log.d(TAG, "Starting recording to: " + normalizedPath);
            
            // Create parent directories if needed
            File outputFile = new File(normalizedPath);
            if (!outputFile.getParentFile().exists()) {
                outputFile.getParentFile().mkdirs();
                Log.d(TAG, "Created parent directories for recording");
            }
            
            // Set up recording parameters
            int sampleRate = SAMPLE_RATE;
            int channelConfig = AudioFormat.CHANNEL_IN_STEREO;
            int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
            
            // Calculate buffer size
            bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
            if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
                bufferSize = sampleRate * 2; // 2 bytes per short
            }
            
            Log.d(TAG, "Starting recording with buffer size: " + bufferSize);
            
            audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize * 10
            );
            
            if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                audioRecord.release();
                promise.reject(E_RECORDING_ERROR, "Failed to initialize AudioRecord");
                return;
            }
            
            recordingFilePath = normalizedPath;
            isRecording = true;
            
            audioRecord.startRecording();
            
            recordingThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    writeAudioDataToFile();
                }
            }, "AudioRecorder Thread");
            
            recordingThread.start();
            
            WritableMap result = Arguments.createMap();
            result.putString("path", recordingFilePath);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error starting recording", e);
            isRecording = false;
            if (audioRecord != null) {
                audioRecord.release();
                audioRecord = null;
            }
            promise.reject(E_RECORDING_ERROR, e.getMessage());
        }
    }
    
    private void writeAudioDataToFile() {
        // Write audio data as WAV file
        byte[] data = new byte[bufferSize];
        ByteArrayOutputStream tempBuffer = new ByteArrayOutputStream();
        int totalBytesRead = 0;
        
        try {
            Log.d(TAG, "Recording to WAV file: " + recordingFilePath);
            
            // Record audio data to temporary buffer first to get total length
            while (isRecording) {
                int read = audioRecord.read(data, 0, bufferSize);
                
                if (read > 0) {
                    tempBuffer.write(data, 0, read);
                    totalBytesRead += read;
                    
                    // Log progress periodically
                    if (totalBytesRead % (bufferSize * 100) == 0) {
                        Log.d(TAG, "Recording progress: " + totalBytesRead + " bytes read");
                    }
                } else if (read == AudioRecord.ERROR_INVALID_OPERATION) {
                    Log.e(TAG, "Error reading audio data: INVALID_OPERATION");
                } else if (read == AudioRecord.ERROR_BAD_VALUE) {
                    Log.e(TAG, "Error reading audio data: BAD_VALUE");
                } else if (read == AudioRecord.ERROR) {
                    Log.e(TAG, "Error reading audio data: ERROR");
                }
            }
            
            Log.d(TAG, "Recording finished. Total bytes read: " + totalBytesRead);
            
            // Now write WAV file with header and audio data
            byte[] audioData = tempBuffer.toByteArray();
            FileOutputStream out = new FileOutputStream(recordingFilePath);
            
            // Write WAV header
            writeWavHeader(out, STEREO_CHANNELS, SAMPLE_RATE, BITS_PER_SAMPLE, audioData.length);
            
            // Write audio data
            out.write(audioData);
            out.close();
            
            File outputFile = new File(recordingFilePath);
            Log.d(TAG, "WAV file created successfully. Size: " + outputFile.length() + " bytes");
            
        } catch (Exception e) {
            Log.e(TAG, "Error writing audio data: " + e.getMessage(), e);
        }
    }
    
    @ReactMethod
    public void stopRecording(Promise promise) {
        if (!isRecording) {
            promise.reject(E_RECORDING_ERROR, "Not recording");
            return;
        }
        
        try {
            isRecording = false;
            if (audioRecord != null) {
                audioRecord.stop();
                audioRecord.release();
                audioRecord = null;
            }
            
            // Wait for recording thread to complete
            if (recordingThread != null) {
                try {
                    recordingThread.join(2000); // Wait up to 2 seconds for thread to finish
                } catch (InterruptedException e) {
                    Log.e(TAG, "Interrupted while waiting for recording thread to finish", e);
                }
                recordingThread = null;
            }
            
            // Verify the file exists and has content
            File recordingFile = new File(recordingFilePath);
            if (!recordingFile.exists()) {
                Log.e(TAG, "Recording file does not exist: " + recordingFilePath);
                promise.reject(E_RECORDING_ERROR, "Recording file does not exist: " + recordingFilePath);
                return;
            }
            
            if (recordingFile.length() == 0) {
                Log.e(TAG, "Recording file is empty: " + recordingFilePath);
                promise.reject(E_RECORDING_ERROR, "Recording file is empty: " + recordingFilePath);
                return;
            }
            
            Log.d(TAG, "Recording stopped successfully. File size: " + recordingFile.length() + " bytes");
            
            WritableMap result = Arguments.createMap();
            result.putString("path", recordingFilePath);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            promise.reject(E_RECORDING_ERROR, e.getMessage());
        }
    }
    
    @ReactMethod
    public void splitStereoToMono(String stereoFilePath, final String leftFilePath, final String rightFilePath, final Promise promise) {
        audioProcessingExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    // Normalize all paths and ensure WAV extension
                    final String normalizedStereoPath = normalizeFilePath(stereoFilePath);
                    final String normalizedLeftPath = ensureWavExtension(normalizeFilePath(leftFilePath));
                    final String normalizedRightPath = ensureWavExtension(normalizeFilePath(rightFilePath));
                    
                    Log.d(TAG, "Splitting stereo file: " + normalizedStereoPath);
                    Log.d(TAG, "Output paths - Left: " + normalizedLeftPath + ", Right: " + normalizedRightPath);
                    
                    // First verify the stereo file exists
                    File stereoFile = new File(normalizedStereoPath);
                    if (!stereoFile.exists()) {
                        Log.e(TAG, "Stereo file does not exist: " + normalizedStereoPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Stereo file does not exist: " + normalizedStereoPath);
                            }
                        });
                        return;
                    }
                    
                    if (stereoFile.length() == 0) {
                        Log.e(TAG, "Stereo file is empty: " + normalizedStereoPath + ", size: " + stereoFile.length());
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Stereo file is empty: " + normalizedStereoPath);
                            }
                        });
                        return;
                    }
                    
                    Log.d(TAG, "Stereo file verified, size: " + stereoFile.length() + " bytes");
                    
                    // Create the output files
                    File leftFile = new File(normalizedLeftPath);
                    File rightFile = new File(normalizedRightPath);
                    
                    // Make sure parent directories exist
                    leftFile.getParentFile().mkdirs();
                    rightFile.getParentFile().mkdirs();
                    
                    // Parse WAV file
                    FileInputStream fis = new FileInputStream(stereoFile);
                    
                    // Skip WAV header to get to PCM data
                    byte[] headerBuffer = new byte[44]; // Standard WAV header is 44 bytes
                    fis.read(headerBuffer);
                    
                    // Check if it's a valid WAV file with PCM format
                    if (!new String(headerBuffer, 0, 4).equals("RIFF") || 
                        !new String(headerBuffer, 8, 4).equals("WAVE") ||
                        !new String(headerBuffer, 12, 4).equals("fmt ")) {
                        Log.e(TAG, "Not a valid WAV file: " + normalizedStereoPath);
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Not a valid WAV file: " + normalizedStereoPath);
                            }
                        });
                        return;
                    }
                    
                    // Parse format chunk to get channels, sample rate, etc.
                    int channels = headerBuffer[22] & 0xFF | (headerBuffer[23] & 0xFF) << 8;
                    int sampleRate = headerBuffer[24] & 0xFF | 
                                   (headerBuffer[25] & 0xFF) << 8 | 
                                   (headerBuffer[26] & 0xFF) << 16 | 
                                   (headerBuffer[27] & 0xFF) << 24;
                    int bitsPerSample = headerBuffer[34] & 0xFF | (headerBuffer[35] & 0xFF) << 8;
                    
                    Log.d(TAG, "WAV file properties - Channels: " + channels + 
                               ", Sample Rate: " + sampleRate + 
                               ", Bits per Sample: " + bitsPerSample);
                    
                    if (channels != 2) {
                        Log.e(TAG, "Not a stereo WAV file (channels: " + channels + ")");
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Not a stereo WAV file. Channels: " + channels);
                            }
                        });
                        return;
                    }
                    
                    // Find data chunk - may not be immediately after format chunk
                    boolean foundDataChunk = false;
                    byte[] chunkHeader = new byte[8]; // 4 bytes ID, 4 bytes size
                    
                    // Skip any non-data chunks between fmt and data
                    while (!foundDataChunk) {
                        int bytesRead = fis.read(chunkHeader);
                        if (bytesRead < 8) {
                            Log.e(TAG, "Unexpected end of file while looking for data chunk");
                            fis.close();
                            reactContext.runOnUiQueueThread(new Runnable() {
                                @Override
                                public void run() {
                                    promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                                }
                            });
                            return;
                        }
                        
                        if (new String(chunkHeader, 0, 4).equals("data")) {
                            foundDataChunk = true;
                            break;
                        }
                        
                        // Skip this chunk
                        int chunkSize = chunkHeader[4] & 0xFF | 
                                      (chunkHeader[5] & 0xFF) << 8 | 
                                      (chunkHeader[6] & 0xFF) << 16 | 
                                      (chunkHeader[7] & 0xFF) << 24;
                        fis.skip(chunkSize);
                    }
                    
                    if (!foundDataChunk) {
                        Log.e(TAG, "No data chunk found in WAV file");
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                            }
                        });
                        return;
                    }
                    
                    // Get data chunk size
                    int dataSize = chunkHeader[4] & 0xFF | 
                                 (chunkHeader[5] & 0xFF) << 8 | 
                                 (chunkHeader[6] & 0xFF) << 16 | 
                                 (chunkHeader[7] & 0xFF) << 24;
                    
                    Log.d(TAG, "Data chunk size: " + dataSize + " bytes");
                    
                    // Read the PCM data
                    byte[] audioData = new byte[dataSize];
                    fis.read(audioData);
                    fis.close();
                    
                    // Create byte buffers for each channel
                    int monoDataSize = dataSize / 2; // Split stereo data in half for mono
                    byte[] leftData = new byte[monoDataSize];
                    byte[] rightData = new byte[monoDataSize];
                    
                    // Separate the channels - for 16-bit stereo, data is interleaved as L1 R1 L2 R2...
                    // Each sample is 2 bytes (16 bits)
                    int byteDepth = bitsPerSample / 8;
                    int leftIdx = 0, rightIdx = 0;
                    
                    for (int i = 0; i < dataSize; i += byteDepth * 2) { // 2 channels
                        // Copy bytes for left channel sample
                        for (int b = 0; b < byteDepth; b++) {
                            leftData[leftIdx++] = audioData[i + b];
                        }
                        
                        // Copy bytes for right channel sample
                        for (int b = 0; b < byteDepth; b++) {
                            rightData[rightIdx++] = audioData[i + byteDepth + b];
                        }
                    }
                    
                    Log.d(TAG, "Separated stereo data into mono channels. " +
                               "Left size: " + leftData.length + " bytes, " +
                               "Right size: " + rightData.length + " bytes");
                    
                    // Write left channel WAV file
                    FileOutputStream leftOS = new FileOutputStream(leftFile);
                    writeWavHeader(leftOS, 1, sampleRate, bitsPerSample, leftData.length);
                    leftOS.write(leftData);
                    leftOS.close();
                    
                    // Write right channel WAV file
                    FileOutputStream rightOS = new FileOutputStream(rightFile);
                    writeWavHeader(rightOS, 1, sampleRate, bitsPerSample, rightData.length);
                    rightOS.write(rightData);
                    rightOS.close();
                    
                    Log.d(TAG, "Split completed successfully");
                    Log.d(TAG, "Left file size: " + leftFile.length() + " bytes");
                    Log.d(TAG, "Right file size: " + rightFile.length() + " bytes");
                    
                    // Return result with original paths (not normalized)
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            WritableMap result = Arguments.createMap();
                            result.putString("leftPath", leftFilePath);
                            result.putString("rightPath", rightFilePath);
                            promise.resolve(result);
                        }
                    });
                } catch (final Exception e) {
                    Log.e(TAG, "Error splitting stereo audio: " + e.getMessage(), e);
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            promise.reject(E_PROCESSING_ERROR, "Failed to split stereo audio: " + e.getMessage());
                        }
                    });
                }
            }
        });
    }
    
    @ReactMethod
    public void calculateRms(String audioFilePath, final Promise promise) {
        audioProcessingExecutor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    // Normalize the file path
                    final String normalizedPath = normalizeFilePath(audioFilePath);
                    Log.d(TAG, "Calculating RMS for: " + normalizedPath);
                    
                    // First verify the file exists
                    File audioFile = new File(normalizedPath);
                    if (!audioFile.exists()) {
                        Log.e(TAG, "Audio file does not exist: " + normalizedPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Audio file does not exist: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    if (audioFile.length() == 0) {
                        Log.e(TAG, "Audio file is empty: " + normalizedPath);
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Audio file is empty: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    Log.d(TAG, "Audio file verified, size: " + audioFile.length() + " bytes");
                    
                    // Parse WAV file
                    FileInputStream fis = new FileInputStream(audioFile);
                    
                    // Skip WAV header to get to PCM data
                    byte[] headerBuffer = new byte[44]; // Standard WAV header is 44 bytes
                    fis.read(headerBuffer);
                    
                    // Check if it's a valid WAV file with PCM format
                    if (!new String(headerBuffer, 0, 4).equals("RIFF") || 
                        !new String(headerBuffer, 8, 4).equals("WAVE") ||
                        !new String(headerBuffer, 12, 4).equals("fmt ")) {
                        Log.e(TAG, "Not a valid WAV file: " + normalizedPath);
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Not a valid WAV file: " + normalizedPath);
                            }
                        });
                        return;
                    }
                    
                    // Parse format chunk
                    int channels = headerBuffer[22] & 0xFF | (headerBuffer[23] & 0xFF) << 8;
                    int bitsPerSample = headerBuffer[34] & 0xFF | (headerBuffer[35] & 0xFF) << 8;
                    
                    Log.d(TAG, "WAV file properties - Channels: " + channels + 
                               ", Bits per Sample: " + bitsPerSample);
                    
                    // Find data chunk
                    boolean foundDataChunk = false;
                    byte[] chunkHeader = new byte[8]; // 4 bytes ID, 4 bytes size
                    
                    // Skip any non-data chunks between fmt and data
                    while (!foundDataChunk) {
                        int bytesRead = fis.read(chunkHeader);
                        if (bytesRead < 8) {
                            Log.e(TAG, "Unexpected end of file while looking for data chunk");
                            fis.close();
                            reactContext.runOnUiQueueThread(new Runnable() {
                                @Override
                                public void run() {
                                    promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                                }
                            });
                            return;
                        }
                        
                        if (new String(chunkHeader, 0, 4).equals("data")) {
                            foundDataChunk = true;
                            break;
                        }
                        
                        // Skip this chunk
                        int chunkSize = chunkHeader[4] & 0xFF | 
                                      (chunkHeader[5] & 0xFF) << 8 | 
                                      (chunkHeader[6] & 0xFF) << 16 | 
                                      (chunkHeader[7] & 0xFF) << 24;
                        fis.skip(chunkSize);
                    }
                    
                    if (!foundDataChunk) {
                        Log.e(TAG, "No data chunk found in WAV file");
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Invalid WAV file format - no data chunk found");
                            }
                        });
                        return;
                    }
                    
                    // Get data chunk size
                    int dataSize = chunkHeader[4] & 0xFF | 
                                 (chunkHeader[5] & 0xFF) << 8 | 
                                 (chunkHeader[6] & 0xFF) << 16 | 
                                 (chunkHeader[7] & 0xFF) << 24;
                    
                    Log.d(TAG, "Data chunk size: " + dataSize + " bytes");
                    
                    // Read the PCM data for RMS calculation
                    int byteDepth = bitsPerSample / 8;
                    int sampleCount = dataSize / (byteDepth * channels);
                    double sumSquares = 0;
                    int samplesProcessed = 0;
                    
                    // For 16-bit audio (most common)
                    if (bitsPerSample == 16) {
                        short[] samples = new short[1024]; // Process in chunks of 1024 samples
                        byte[] buffer = new byte[1024 * byteDepth * channels];
                        int bytesRead;
                        
                        while ((bytesRead = fis.read(buffer)) > 0) {
                            ByteBuffer bb = ByteBuffer.wrap(buffer, 0, bytesRead);
                            bb.order(ByteOrder.LITTLE_ENDIAN);
                            ShortBuffer sb = bb.asShortBuffer();
                            
                            int shortsRead = bytesRead / 2; // 2 bytes per short
                            sb.get(samples, 0, Math.min(shortsRead, samples.length));
                            
                            // If stereo, only use one channel for RMS
                            int inc = channels;
                            for (int i = 0; i < shortsRead; i += inc) {
                                short sample = samples[i];
                                sumSquares += sample * sample;
                                samplesProcessed++;
                            }
                        }
                    } else {
                        // Skip other bit depths for simplicity
                        Log.e(TAG, "Unsupported bit depth: " + bitsPerSample);
                        fis.close();
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "Unsupported bit depth: " + bitsPerSample);
                            }
                        });
                        return;
                    }
                    
                    fis.close();
                    
                    if (samplesProcessed == 0) {
                        Log.e(TAG, "No samples processed for RMS calculation");
                        reactContext.runOnUiQueueThread(new Runnable() {
                            @Override
                            public void run() {
                                promise.reject(E_PROCESSING_ERROR, "No valid samples found for RMS calculation");
                            }
                        });
                        return;
                    }
                    
                    // Calculate RMS (Root Mean Square)
                    double rms = Math.sqrt(sumSquares / samplesProcessed);
                    
                    // Normalize to 0-1 range (16-bit PCM has range -32768 to 32767)
                    double normalizedRms = rms / 32768.0;
                    
                    Log.d(TAG, "Calculated RMS: " + normalizedRms + " from " + samplesProcessed + " samples");
                    
                    // Return result
                    final double finalRms = normalizedRms;
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            promise.resolve(finalRms);
                        }
                    });
                } catch (final Exception e) {
                    Log.e(TAG, "Error calculating RMS: " + e.getMessage(), e);
                    reactContext.runOnUiQueueThread(new Runnable() {
                        @Override
                        public void run() {
                            promise.reject(E_PROCESSING_ERROR, "Failed to calculate RMS: " + e.getMessage());
                        }
                    });
                }
            }
        });
    }
    
    /**
     * Utility method to help with ByteArrayOutputStream
     */
    private static class ByteArrayOutputStream extends java.io.ByteArrayOutputStream {
        public byte[] getBuffer() {
            return buf;
        }
    }
}