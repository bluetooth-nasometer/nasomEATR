import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import uuid from 'react-native-uuid';

const AddPatientScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [mrn, setMrn] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // const uploadImage = async (uri) => {
  //   try {
  //     const photoPath = `patient-photos/${uuid.v4()}.jpg`;
  //     const photo = {
  //       uri: uri,
  //       type: "image/jpeg",
  //       name: "upload.jpg"
  //     };

  //     // Convert URI to Blob
  //     const response = await fetch(uri);
  //     const blob = await response.blob();

  //     // Upload to Supabase storage
  //     const { data, error } = await supabase.storage
  //       .from('patient-photos')
  //       .upload(photoPath, blob);

  //     if (error) throw error;

  //     // Get public URL
  //     const { data: { publicUrl } } = supabase.storage
  //       .from('patient-photos')
  //       .getPublicUrl(photoPath);

  //     return publicUrl;
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //     throw error;
  //   }
  // };

  const checkMRNUnique = async (mrn) => {
    const { data, error } = await supabase
      .from('patient')
      .select('mrn')
      .eq('mrn', mrn)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !data;
  };

  const validateDate = (text, type) => {
    const num = parseInt(text);
    switch (type) {
      case 'year':
        if (num > 0 && num <= new Date().getFullYear()) {
          setYear(text);
        }
        break;
      case 'month':
        if (num >= 1 && num <= 12) {
          setMonth(text);
        }
        break;
      case 'day':
        if (num >= 1 && num <= 31) {
          setDay(text);
        }
        break;
    }
  };

  const handleSubmit = async () => {
    if (!name || !gender || !year || !month || !day || !mrn) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Validate MRN uniqueness
      const isUnique = await checkMRNUnique(mrn);
      if (!isUnique) {
        Alert.alert('Error', 'This MRN already exists');
        return;
      }

      // Get current clinician's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Upload image if exists
      let pictureUrl = null;
      // if (image) {
      //   pictureUrl = await uploadImage(image);
      // }

      // Create patient record
      const { error: insertError } = await supabase
        .from('patient')
        .insert([{
          mrn: parseInt(mrn),
          full_name: name,
          dob: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          gender: gender,
          assigned_clinician: user.id,
          picture_url: pictureUrl
        }]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Patient added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Patient</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.form, styles.centerContent]}>
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={40} color={Colors.lightNavalBlue} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[styles.input, styles.centerText]}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          textAlign="center"
        />

        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'M' && styles.genderSelected]}
            onPress={() => setGender('M')}
          >
            <Text style={[styles.genderText, gender === 'M' && styles.genderTextSelected]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, gender === 'F' && styles.genderSelected]}
            onPress={() => setGender('F')}
          >
            <Text style={[styles.genderText, gender === 'F' && styles.genderTextSelected]}>Female</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, styles.centerText]}>Date of Birth</Text>
        <View style={styles.dateContainer}>
          <TextInput
            style={[styles.dateInput, styles.centerText]}
            placeholder="MM"
            value={month}
            onChangeText={(text) => validateDate(text, 'month')}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.dateSeparator}>/</Text>
          <TextInput
            style={[styles.dateInput, styles.centerText]}
            placeholder="DD"
            value={day}
            onChangeText={(text) => validateDate(text, 'day')}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.dateSeparator}>/</Text>
          <TextInput
            style={[styles.dateInput, styles.centerText]}
            placeholder="YYYY"
            value={year}
            onChangeText={(text) => validateDate(text, 'year')}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        <TextInput
          style={[styles.input, styles.centerText]}
          placeholder="Medical Record Number (MRN)"
          value={mrn}
          onChangeText={setMrn}
          textAlign="center"
        />

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding Patient...' : 'Add Patient'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  saveButton: {
    color: Colors.lightNavalBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    marginTop: 10,
    color: Colors.lightNavalBlue,
  },
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    width: '100%', // Full width for other inputs
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  genderButton: {
    flex: 0.48,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: Colors.lightNavalBlue,
    borderColor: Colors.lightNavalBlue,
  },
  genderText: {
    fontSize: 16,
    color: '#666',
  },
  genderTextSelected: {
    color: Colors.white,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    width: 80, // Fixed width for uniform appearance
  },
  dateSeparator: {
    fontSize: 20,
    marginHorizontal: 10,
    color: '#666',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  centerContent: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.lightNavalBlue,
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default AddPatientScreen;
