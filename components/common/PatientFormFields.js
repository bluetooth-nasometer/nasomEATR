import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const PatientFormFields = ({
  name,
  setName,
  gender,
  setGender,
  birthDate,
  onDateChange,
  image,
  onImagePick,
  mrn,
  mrnEditable = true,
  setMrn,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.imageContainer} onPress={onImagePick}>
        {image ? (
          <Image source={{ uri: image.uri || image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera" size={40} color={Colors.lightNavalBlue} />
            <Text style={styles.addPhotoText}>
              {mrnEditable ? 'Add Photo' : 'Change Photo'}
            </Text>
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
          <Text style={[styles.genderText, gender === 'M' && styles.genderTextSelected]}>
            Male
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, gender === 'F' && styles.genderSelected]}
          onPress={() => setGender('F')}
        >
          <Text style={[styles.genderText, gender === 'F' && styles.genderTextSelected]}>
            Female
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, styles.centerText]}>Date of Birth</Text>
      <View style={styles.dateContainer}>
        <TextInput
          style={[styles.dateInput, styles.centerText]}
          placeholder="MM"
          value={birthDate.month}
          onChangeText={(text) => onDateChange(text, 'month')}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          style={[styles.dateInput, styles.centerText]}
          placeholder="DD"
          value={birthDate.day}
          onChangeText={(text) => onDateChange(text, 'day')}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          style={[styles.dateInput, styles.centerText]}
          placeholder="YYYY"
          value={birthDate.year}
          onChangeText={(text) => onDateChange(text, 'year')}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      <TextInput
        style={[styles.input, styles.centerText]}
        placeholder="Medical Record Number (MRN)"
        value={mrn}
        onChangeText={setMrn}
        editable={mrnEditable}
        textAlign="center"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
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
    width: 80,
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
  centerText: {
    textAlign: 'center',
  },
});

export default PatientFormFields;
