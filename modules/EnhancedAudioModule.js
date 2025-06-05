/**
 * EnhancedAudioModule.js
 * 
 * A React Native module for advanced audio recording and processing
 * with specialized device detection for stereo microphones
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Native module interface
const { EnhancedAudioModule: NativeEnhancedAudioModule } = NativeModules;

// Event emitter for device events
const audioDeviceEventEmitter = new NativeEventEmitter(NativeEnhancedAudioModule);

/**
 * Audio quality thresholds for medical applications
 */
const QUALITY_THRESHOLDS = {
  MIN_RMS: 0.001,           // Minimum acceptable RMS level
  MAX_RMS: 0.8,             // Maximum RMS before considering overload
  MIN_DYNAMIC_RANGE: 0.1,   // Minimum dynamic range for good recording
  MIN_SNR: 20,              // Minimum signal-to-noise ratio (dB)
  MAX_CLIPPING_TOLERANCE: 0 // Zero tolerance for clipping in medical apps
};

/**
 * EnhancedAudioModule provides methods for device selection, stereo recording, 
 * and advanced audio processing
 */
class EnhancedAudioModule {
  /**
   * Check if the module is available on this platform
   * @returns {boolean} True if the module is available
   */
  static isAvailable() {
    return NativeEnhancedAudioModule !== null && NativeEnhancedAudioModule !== undefined;
  }

  /**
   * Start scanning for available audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning started
   */
  static startDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.startDeviceScan();
  }

  /**
   * Stop scanning for audio devices
   * @returns {Promise<boolean>} Promise resolving to true if scanning stopped
   */
  static stopDeviceScan() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.stopDeviceScan();
  }

  /**
   * Get a list of available audio input devices
   * @returns {Promise<Array<AudioDevice>>} Promise resolving to array of device objects
   */
  static getAvailableDevices() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.getAvailableDevices();
  }

  /**
   * Get the currently selected audio input device
   * @returns {Promise<AudioDevice|null>} Promise resolving to current device or null
   */
  static getCurrentDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.getCurrentDevice();
  }

  /**
   * Select an audio device for recording
   * @param {string} deviceId The ID of the device to select
   * @returns {Promise<AudioDevice>} Promise resolving to the selected device
   */
  static selectDevice(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.selectDevice(deviceId);
  }

  /**
   * Reset to default device
   * @returns {Promise<AudioDevice>} Promise resolving to the default device
   */
  static resetToDefaultDevice() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.resetToDefaultDevice();
  }

  /**
   * Check if a device supports stereo recording
   * @param {string} deviceId The ID of the device to check
   * @returns {Promise<boolean>} Promise resolving to true if stereo is supported
   */
  static supportsStereoRecording(deviceId) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.supportsStereoRecording(deviceId);
  }

  /**
   * Start recording with the selected device
   * @param {string} filePath Path where the recording will be saved
   * @param {Object} options Recording options
   * @returns {Promise<{path: string}>} Promise resolving to recording file path
   */
  static startRecording(filePath, options = {}) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    // Convert to absolute path if needed
    let absolutePath = filePath;
    if (!filePath.startsWith('file://') && !filePath.startsWith('/')) {
      absolutePath = `${FileSystem.documentDirectory}${filePath}`;
    }
    
    // Ensure WAV extension for compatibility
    if (!absolutePath.toLowerCase().endsWith('.wav')) {
      absolutePath = absolutePath.replace(/\.[^.]*$/, '') + '.wav';
    }
    
    return NativeEnhancedAudioModule.startRecording(absolutePath);
  }

  /**
   * Stop recording
   * @returns {Promise<{path: string}>} Promise resolving to recording file path
   */
  static stopRecording() {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    return NativeEnhancedAudioModule.stopRecording();
  }

  /**
   * Split a stereo recording into separate left and right channel files
   * @param {string} stereoFilePath Path to the stereo recording
   * @param {string} leftFilePath Path where the left channel file will be saved
   * @param {string} rightFilePath Path where the right channel file will be saved
   * @returns {Promise<{leftPath: string, rightPath: string}>} Promise resolving to the output file paths
   */
  static splitStereoToMono(stereoFilePath, leftFilePath, rightFilePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    // Convert to absolute paths if needed and ensure WAV extensions
    const absoluteStereoPath = this._toAbsolutePath(stereoFilePath);
    const absoluteLeftPath = this._toAbsolutePath(leftFilePath, '.wav');
    const absoluteRightPath = this._toAbsolutePath(rightFilePath, '.wav');
    
    return NativeEnhancedAudioModule.splitStereoToMono(
      absoluteStereoPath,
      absoluteLeftPath,
      absoluteRightPath
    );
  }

  /**
   * Calculate the RMS (Root Mean Square) value of an audio file
   * @param {string} audioFilePath Path to the audio file
   * @returns {Promise<number>} Promise resolving to the RMS value (0-1 range)
   */
  static calculateRms(audioFilePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    const absolutePath = this._toAbsolutePath(audioFilePath);
    return NativeEnhancedAudioModule.calculateRms(absolutePath);
  }

  /**
   * Perform comprehensive audio quality analysis
   * @param {string} audioFilePath Path to the audio file
   * @returns {Promise<AudioQualityAnalysis>} Promise resolving to quality analysis results
   */
  static analyzeAudioQuality(audioFilePath) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('EnhancedAudioModule is not available'));
    }
    
    const absolutePath = this._toAbsolutePath(audioFilePath);
    return NativeEnhancedAudioModule.analyzeAudioQuality(absolutePath);
  }

  /**
   * Validate audio quality for medical applications
   * @param {string} audioFilePath Path to the audio file
   * @returns {Promise<AudioQualityValidation>} Promise resolving to validation results
   */
  static async validateAudioQuality(audioFilePath) {
    try {
      const analysis = await this.analyzeAudioQuality(audioFilePath);
      
      const validation = {
        isValid: true,
        warnings: [],
        errors: [],
        analysis
      };

      // Check RMS levels
      if (analysis.rms < QUALITY_THRESHOLDS.MIN_RMS) {
        validation.errors.push(`Audio level too low (RMS: ${analysis.rms.toFixed(4)}, minimum: ${QUALITY_THRESHOLDS.MIN_RMS})`);
        validation.isValid = false;
      }
      
      if (analysis.rms > QUALITY_THRESHOLDS.MAX_RMS) {
        validation.warnings.push(`Audio level very high (RMS: ${analysis.rms.toFixed(4)}, recommended max: ${QUALITY_THRESHOLDS.MAX_RMS})`);
      }

      // Check for clipping
      if (analysis.clipping) {
        validation.errors.push('Audio clipping detected - recording may be distorted');
        validation.isValid = false;
      }

      // Check dynamic range
      if (analysis.dynamicRange < QUALITY_THRESHOLDS.MIN_DYNAMIC_RANGE) {
        validation.warnings.push(`Low dynamic range (${analysis.dynamicRange.toFixed(4)}, recommended min: ${QUALITY_THRESHOLDS.MIN_DYNAMIC_RANGE})`);
      }

      // Check signal-to-noise ratio
      if (analysis.snr < QUALITY_THRESHOLDS.MIN_SNR) {
        validation.warnings.push(`Low signal-to-noise ratio (${analysis.snr.toFixed(1)} dB, recommended min: ${QUALITY_THRESHOLDS.MIN_SNR} dB)`);
      }

      // Medical application specific checks
      if (analysis.peakAmplitude > 0.95) {
        validation.errors.push('Peak amplitude too high - risk of saturation');
        validation.isValid = false;
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        warnings: [],
        errors: [`Audio quality analysis failed: ${error.message}`],
        analysis: null
      };
    }
  }

  /**
   * Process stereo recording for nasalance analysis
   * Enhanced with quality validation
   * @param {string} stereoRecordingPath Path to stereo recording
   * @param {string} nasalChannelPath Output path for nasal channel
   * @param {string} oralChannelPath Output path for oral channel
   * @returns {Promise<NasalanceProcessingResult>} Processing results with quality metrics
   */
  static async processForNasalanceAnalysis(stereoRecordingPath, nasalChannelPath, oralChannelPath) {
    try {
      // Step 1: Validate input audio quality
      console.log('Validating stereo recording quality...');
      const qualityValidation = await this.validateAudioQuality(stereoRecordingPath);
      
      if (!qualityValidation.isValid) {
        console.warn('Audio quality issues detected:', qualityValidation.errors);
      }
      
      // Step 2: Split stereo to mono channels
      console.log('Splitting stereo channels...');
      const splitResult = await this.splitStereoToMono(
        stereoRecordingPath,
        nasalChannelPath,
        oralChannelPath
      );
      
      // Step 3: Calculate RMS for each channel
      console.log('Calculating RMS values...');
      const [nasalRms, oralRms] = await Promise.all([
        this.calculateRms(splitResult.leftPath),   // Assuming left = nasal
        this.calculateRms(splitResult.rightPath)   // Assuming right = oral
      ]);
      
      // Step 4: Validate individual channel quality
      const [nasalQuality, oralQuality] = await Promise.all([
        this.validateAudioQuality(splitResult.leftPath),
        this.validateAudioQuality(splitResult.rightPath)
      ]);
      
      // Step 5: Calculate nasalance score with enhanced precision
      const nasalanceScore = this._calculateNasalanceScore(nasalRms, oralRms);
      
      // Step 6: Compile comprehensive results
      const result = {
        success: true,
        paths: {
          nasal: splitResult.leftPath,
          oral: splitResult.rightPath
        },
        rmsValues: {
          nasal: nasalRms,
          oral: oralRms
        },
        nasalanceScore,
        qualityMetrics: {
          stereo: qualityValidation,
          nasal: nasalQuality,
          oral: oralQuality
        },
        recommendations: this._generateRecommendations(qualityValidation, nasalQuality, oralQuality)
      };
      
      console.log('Nasalance processing completed successfully');
      console.log(`Nasalance Score: ${nasalanceScore.toFixed(2)}%`);
      
      return result;
      
    } catch (error) {
      console.error('Error in nasalance processing:', error);
      throw new Error(`Nasalance processing failed: ${error.message}`);
    }
  }

  /**
   * Calculate nasalance score using the standard formula
   * Enhanced with validation and edge case handling
   * @private
   */
  static _calculateNasalanceScore(nasalRms, oralRms) {
    // Validate inputs
    if (typeof nasalRms !== 'number' || typeof oralRms !== 'number') {
      throw new Error('Invalid RMS values for nasalance calculation');
    }
    
    if (nasalRms < 0 || oralRms < 0) {
      throw new Error('RMS values cannot be negative');
    }
    
    // Handle edge cases
    if (nasalRms === 0 && oralRms === 0) {
      console.warn('Both nasal and oral RMS are zero - silent recording detected');
      return 0;
    }
    
    if (oralRms === 0) {
      console.warn('Oral RMS is zero - possible recording issue');
      return 100; // All nasal energy
    }
    
    // Standard nasalance formula: (Nasal Energy / Total Energy) * 100
    const totalEnergy = nasalRms + oralRms;
    const nasalanceScore = (nasalRms / totalEnergy) * 100;
    
    // Clamp to valid range [0, 100]
    return Math.max(0, Math.min(100, nasalanceScore));
  }

  /**
   * Generate quality-based recommendations for medical practitioners
   * @private
   */
  static _generateRecommendations(stereoQuality, nasalQuality, oralQuality) {
    const recommendations = [];
    
    // Stereo recording recommendations
    if (stereoQuality.errors.length > 0) {
      recommendations.push({
        type: 'error',
        category: 'recording',
        message: 'Stereo recording has quality issues that may affect nasalance accuracy',
        details: stereoQuality.errors
      });
    }
    
    // Channel-specific recommendations
    if (!nasalQuality.isValid) {
      recommendations.push({
        type: 'warning',
        category: 'nasal_channel',
        message: 'Nasal channel quality issues detected',
        details: nasalQuality.errors.concat(nasalQuality.warnings)
      });
    }
    
    if (!oralQuality.isValid) {
      recommendations.push({
        type: 'warning',
        category: 'oral_channel',
        message: 'Oral channel quality issues detected',
        details: oralQuality.errors.concat(oralQuality.warnings)
      });
    }
    
    // Clinical recommendations
    const nasalRms = nasalQuality.analysis?.rms || 0;
    const oralRms = oralQuality.analysis?.rms || 0;
    
    if (Math.abs(nasalRms - oralRms) > 0.5) {
      recommendations.push({
        type: 'info',
        category: 'clinical',
        message: 'Significant difference in channel levels detected',
        details: ['Consider checking microphone positioning and patient instruction']
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        category: 'overall',
        message: 'Recording quality is excellent for nasalance analysis',
        details: ['All quality metrics are within acceptable ranges']
      });
    }
    
    return recommendations;
  }

  /**
   * Convert to absolute path and optionally ensure extension
   * @private
   */
  static _toAbsolutePath(filePath, forceExtension = null) {
    if (!filePath) return null;
    
    let absolutePath = filePath;
    if (!filePath.startsWith('file://') && !filePath.startsWith('/')) {
      absolutePath = `${FileSystem.documentDirectory}${filePath}`;
    }
    
    if (forceExtension && !absolutePath.toLowerCase().endsWith(forceExtension)) {
      absolutePath = absolutePath.replace(/\.[^.]*$/, '') + forceExtension;
    }
    
    return absolutePath;
  }

  /**
   * Batch process multiple recordings for research applications
   * @param {Array<string>} recordingPaths Array of stereo recording paths
   * @param {string} outputDirectory Directory for processed files
   * @returns {Promise<Array<NasalanceProcessingResult>>} Array of processing results
   */
  static async batchProcessRecordings(recordingPaths, outputDirectory) {
    if (!Array.isArray(recordingPaths) || recordingPaths.length === 0) {
      throw new Error('Invalid recording paths array');
    }
    
    console.log(`Starting batch processing of ${recordingPaths.length} recordings...`);
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < recordingPaths.length; i++) {
      const recordingPath = recordingPaths[i];
      
      try {
        console.log(`Processing recording ${i + 1}/${recordingPaths.length}: ${recordingPath}`);
        
        // Generate output paths
        const baseName = recordingPath.split('/').pop().replace(/\.[^.]*$/, '');
        const nasalPath = `${outputDirectory}/${baseName}_nasal.wav`;
        const oralPath = `${outputDirectory}/${baseName}_oral.wav`;
        
        // Process the recording
        const result = await this.processForNasalanceAnalysis(
          recordingPath,
          nasalPath,
          oralPath
        );
        
        result.index = i;
        result.originalPath = recordingPath;
        results.push(result);
        
      } catch (error) {
        console.error(`Error processing recording ${i + 1}:`, error);
        errors.push({
          index: i,
          path: recordingPath,
          error: error.message
        });
      }
    }
    
    console.log(`Batch processing completed. ${results.length} successful, ${errors.length} failed.`);
    
    return {
      results,
      errors,
      summary: {
        total: recordingPaths.length,
        successful: results.length,
        failed: errors.length,
        successRate: (results.length / recordingPaths.length) * 100
      }
    };
  }

  /**
   * Export processing results to CSV for research analysis
   * @param {Array<NasalanceProcessingResult>} results Array of processing results
   * @returns {string} CSV formatted data
   */
  static exportResultsToCSV(results) {
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('No results to export');
    }
    
    // CSV headers
    const headers = [
      'Index',
      'Original_Path',
      'Nasal_Path',
      'Oral_Path',
      'Nasal_RMS',
      'Oral_RMS',
      'Nasalance_Score',
      'Stereo_Quality_Valid',
      'Nasal_Quality_Valid',
      'Oral_Quality_Valid',
      'Has_Quality_Issues',
      'Peak_Amplitude',
      'Dynamic_Range',
      'SNR_dB',
      'Has_Clipping'
    ];
    
    // Convert results to CSV rows
    const rows = results.map(result => [
      result.index || '',
      result.originalPath || '',
      result.paths?.nasal || '',
      result.paths?.oral || '',
      result.rmsValues?.nasal?.toFixed(6) || '',
      result.rmsValues?.oral?.toFixed(6) || '',
      result.nasalanceScore?.toFixed(2) || '',
      result.qualityMetrics?.stereo?.isValid || false,
      result.qualityMetrics?.nasal?.isValid || false,
      result.qualityMetrics?.oral?.isValid || false,
      (result.qualityMetrics?.stereo?.errors?.length > 0 || 
       result.qualityMetrics?.nasal?.errors?.length > 0 || 
       result.qualityMetrics?.oral?.errors?.length > 0) || false,
      result.qualityMetrics?.stereo?.analysis?.peakAmplitude?.toFixed(4) || '',
      result.qualityMetrics?.stereo?.analysis?.dynamicRange?.toFixed(4) || '',
      result.qualityMetrics?.stereo?.analysis?.snr?.toFixed(2) || '',
      result.qualityMetrics?.stereo?.analysis?.clipping || false
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  /**
   * Add listener for device connected events
   * @param {function} listener Callback function for device connected events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceConnectedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceConnected', listener);
  }

  /**
   * Add listener for device disconnected events
   * @param {function} listener Callback function for device disconnected events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceDisconnectedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceDisconnected', listener);
  }

  /**
   * Add listener for device list changed events
   * @param {function} listener Callback function for device list changed events
   * @returns {EmitterSubscription} Subscription object for the listener
   */
  static addDeviceListChangedListener(listener) {
    return audioDeviceEventEmitter.addListener('onDeviceListChanged', listener);
  }
}

export default EnhancedAudioModule;