package com.nasomeater;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothHeadset;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class BluetoothAudioModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BluetoothAudio";
    private static final String TAG = "NasomeaterBTAudio";

    private final ReactApplicationContext reactContext;
    private MediaRecorder mediaRecorder;
    private boolean isRecording = false;
    private String currentOutputFile = null;
    private AudioManager audioManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothHeadset bluetoothHeadset;

    public BluetoothAudioModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.audioManager = (AudioManager) reactContext.getSystemService(Context.AUDIO_SERVICE);
        this.bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        
        // Initialize Bluetooth Headset profile
        if (bluetoothAdapter != null) {
            bluetoothAdapter.getProfileProxy(reactContext, new BluetoothProfile.ServiceListener() {
                public void onServiceConnected(int profile, BluetoothProfile proxy) {
                    if (profile == BluetoothProfile.HEADSET) {
                        bluetoothHeadset = (BluetoothHeadset) proxy;
                        Log.d(TAG, "Bluetooth Headset profile connected for audio");
                    }
                }

                public void onServiceDisconnected(int profile) {
                    if (profile == BluetoothProfile.HEADSET) {
                        bluetoothHeadset = null;
                        Log.d(TAG, "Bluetooth Headset profile disconnected for audio");
                    }
                }
            }, BluetoothProfile.HEADSET);
        }
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Get available audio input sources
     */
    @ReactMethod
    public void getAvailableAudioSources(Promise promise) {
        try {
            WritableArray sources = Arguments.createArray();
            
            // Add standard audio sources
            WritableMap defaultSource = Arguments.createMap();
            defaultSource.putString("id", String.valueOf(MediaRecorder.AudioSource.DEFAULT));
            defaultSource.putString("name", "Default");
            sources.pushMap(defaultSource);
            
            WritableMap micSource = Arguments.createMap();
            micSource.putString("id", String.valueOf(MediaRecorder.AudioSource.MIC));
            micSource.putString("name", "Microphone");
            sources.pushMap(micSource);
            
            WritableMap camSource = Arguments.createMap();
            camSource.putString("id", String.valueOf(MediaRecorder.AudioSource.CAMCORDER));
            camSource.putString("name", "Camcorder");
            sources.pushMap(camSource);
            
            // If Bluetooth headset is available, add it
            if (bluetoothHeadset != null) {
                if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    List<BluetoothDevice> connectedDevices = bluetoothHeadset.getConnectedDevices();
                    
                    for (BluetoothDevice device : connectedDevices) {
                        WritableMap btSource = Arguments.createMap();
                        btSource.putString("id", "bt_" + device.getAddress());
                        btSource.putString("name", device.getName() != null ? device.getName() : "Bluetooth Device");
                        btSource.putString("type", "bluetooth_sco");
                        sources.pushMap(btSource);
                    }
                }
            }
            
            promise.resolve(sources);
        } catch (Exception e) {
            Log.e(TAG, "Error getting audio sources: " + e.getMessage());
            promise.reject("ERR_AUDIO_SOURCES", e.getMessage());
        }
    }

    /**
     * Start audio recording with specified settings
     * @param options Recording options
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void startRecording(String filePath, String deviceId, Promise promise) {
        if (isRecording) {
            promise.reject("ERR_ALREADY_RECORDING", "Already recording");
            return;
        }

        try {
            // Set up MediaRecorder
            prepareRecorder(filePath);
            
            // Enable Bluetooth SCO audio if using a Bluetooth device
            if (deviceId != null && deviceId.startsWith("bt_")) {
                enableBluetoothSco();
            }
            
            mediaRecorder.start();
            isRecording = true;
            promise.resolve(true);
            
            sendEvent("recordingStarted", null);
            Log.d(TAG, "Started recording to: " + filePath);
        } catch (Exception e) {
            cleanupMediaRecorder();
            Log.e(TAG, "Error starting recording: " + e.getMessage());
            promise.reject("ERR_RECORDING_START", e.getMessage());
        }
    }

    private void prepareRecorder(String filePath) throws IOException {
        cleanupMediaRecorder();
        
        currentOutputFile = filePath;
        mediaRecorder = new MediaRecorder();

        // Configure audio settings
        mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC); // Default to phone mic
        mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.AAC_ADTS);
        mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        mediaRecorder.setAudioChannels(1); // Mono
        mediaRecorder.setAudioSamplingRate(44100); // 44.1kHz
        mediaRecorder.setAudioEncodingBitRate(128000); // 128kbps
        
        // Ensure output directory exists
        File outputFile = new File(filePath);
        File parentDir = outputFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }
        
        mediaRecorder.setOutputFile(filePath);
        mediaRecorder.prepare();
    }

    private void enableBluetoothSco() {
        audioManager.startBluetoothSco();
        audioManager.setBluetoothScoOn(true);
        
        // Give some time for SCO to start
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Log.e(TAG, "Sleep interrupted while enabling Bluetooth SCO");
        }
    }

    /**
     * Stop current recording
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void stopRecording(Promise promise) {
        if (!isRecording) {
            promise.reject("ERR_NOT_RECORDING", "Not currently recording");
            return;
        }

        try {
            mediaRecorder.stop();
            isRecording = false;
            
            // Disable Bluetooth SCO audio
            if (audioManager.isBluetoothScoOn()) {
                audioManager.setBluetoothScoOn(false);
                audioManager.stopBluetoothSco();
            }
            
            cleanupMediaRecorder();
            
            WritableMap result = Arguments.createMap();
            result.putString("filePath", currentOutputFile);
            
            sendEvent("recordingStopped", result);
            promise.resolve(result);
            
            Log.d(TAG, "Stopped recording, file at: " + currentOutputFile);
            currentOutputFile = null;
        } catch (Exception e) {
            cleanupMediaRecorder();
            Log.e(TAG, "Error stopping recording: " + e.getMessage());
            promise.reject("ERR_RECORDING_STOP", e.getMessage());
        }
    }

    /**
     * Check if currently recording
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void isRecording(Promise promise) {
        promise.resolve(isRecording);
    }
    
    /**
     * Get maximum audio level observed during recording
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getMaxAmplitude(Promise promise) {
        if (!isRecording || mediaRecorder == null) {
            promise.resolve(0);
            return;
        }
        
        try {
            int maxAmplitude = mediaRecorder.getMaxAmplitude();
            promise.resolve(maxAmplitude);
        } catch (Exception e) {
            Log.e(TAG, "Error getting max amplitude: " + e.getMessage());
            promise.resolve(0);
        }
    }
    
    /**
     * Check if Bluetooth SCO is available
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void isBluetoothScoAvailable(Promise promise) {
        try {
            boolean isHeadsetConnected = false;
            
            if (bluetoothHeadset != null) {
                if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    isHeadsetConnected = !bluetoothHeadset.getConnectedDevices().isEmpty();
                }
            }
            
            promise.resolve(isHeadsetConnected);
        } catch (Exception e) {
            Log.e(TAG, "Error checking Bluetooth SCO availability: " + e.getMessage());
            promise.resolve(false);
        }
    }
    
    /**
     * Start Bluetooth SCO audio connection
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void startBluetoothSco(Promise promise) {
        try {
            audioManager.startBluetoothSco();
            audioManager.setBluetoothScoOn(true);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error starting Bluetooth SCO: " + e.getMessage());
            promise.reject("ERR_START_BT_SCO", e.getMessage());
        }
    }
    
    /**
     * Stop Bluetooth SCO audio connection
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void stopBluetoothSco(Promise promise) {
        try {
            audioManager.setBluetoothScoOn(false);
            audioManager.stopBluetoothSco();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error stopping Bluetooth SCO: " + e.getMessage());
            promise.reject("ERR_STOP_BT_SCO", e.getMessage());
        }
    }
    
    /**
     * Get current audio routing
     * @param promise Promise to resolve
     */
    @ReactMethod
    public void getAudioRouting(Promise promise) {
        WritableMap routing = Arguments.createMap();
        
        try {
            boolean isSpeakerphoneOn = audioManager.isSpeakerphoneOn();
            boolean isBluetoothScoOn = audioManager.isBluetoothScoOn();
            boolean isBluetoothA2dpOn = audioManager.isBluetoothA2dpOn();
            
            routing.putBoolean("speakerphone", isSpeakerphoneOn);
            routing.putBoolean("bluetoothSco", isBluetoothScoOn);
            routing.putBoolean("bluetoothA2dp", isBluetoothA2dpOn);
            
            // Get the name of active devices if available
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                String activeDevice = "unknown";
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo device : devices) {
                    if (device.isSink()) {
                        activeDevice = device.getProductName().toString();
                        break;
                    }
                }
                routing.putString("activeDevice", activeDevice);
            } else {
                routing.putString("activeDevice", "unknown");
            }
            
            promise.resolve(routing);
        } catch (Exception e) {
            Log.e(TAG, "Error getting audio routing: " + e.getMessage());
            promise.reject("ERR_AUDIO_ROUTING", e.getMessage());
        }
    }

    private void cleanupMediaRecorder() {
        if (mediaRecorder != null) {
            try {
                mediaRecorder.reset();
                mediaRecorder.release();
            } catch (Exception e) {
                Log.e(TAG, "Error cleaning up MediaRecorder: " + e.getMessage());
            } finally {
                mediaRecorder = null;
            }
        }
        
        isRecording = false;
    }

    private void sendEvent(String eventName, Object params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
    
    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("AUDIO_SOURCE_DEFAULT", MediaRecorder.AudioSource.DEFAULT);
        constants.put("AUDIO_SOURCE_MIC", MediaRecorder.AudioSource.MIC);
        constants.put("AUDIO_SOURCE_CAMCORDER", MediaRecorder.AudioSource.CAMCORDER);
        constants.put("AUDIO_SOURCE_VOICE_RECOGNITION", MediaRecorder.AudioSource.VOICE_RECOGNITION);
        return constants;
    }
}
