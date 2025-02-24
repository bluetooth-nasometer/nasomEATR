import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Alert,
  Image 
} from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import LoadingIndicator from './common/LoadingIndicator';
import Button from './common/Button';

const { width } = Dimensions.get('window');
const arcHeight = 300; // Height of the arc background

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigation.replace('Dashboard');  // Changed from 'MainApp' to 'Dashboard'
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data) {
        navigation.replace('Dashboard');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator text="Signing in..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Arc Banner with Logo */}
      <View style={styles.arcContainer}>
        <View style={styles.arc} />
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button 
          title={loading ? 'Signing in...' : 'Sign In'}
          onPress={handleLogin}
          disabled={loading}
          loading={loading}
          size="large"
          style={styles.loginButton}
        />

        {/* Moved signup section here */}
        <View style={styles.signupContainer}>
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Don't have an account?</Text>
            <View style={styles.divider} />
          </View>
          
          <Button 
            title="Sign Up"
            onPress={() => navigation.navigate('Signup')}
            variant="secondary"
            size="large"
            style={styles.signupButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  arcContainer: {
    height: arcHeight,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  arc: {
    position: 'absolute',
    top: -arcHeight * 2,
    width: width * 1.2,
    height: width * 2.2,
    borderRadius: width * 1.5, // Half of width/height
    backgroundColor: Colors.lightNavalBlue,
    alignSelf: 'center',
    transform: [{ scaleX: 1.8 }], // Increased from 1.5 to 1.8 for more horizontal stretch
  },
  logo: {
    width: 225,
    height: 225,
    marginTop: 80, // Increased from 40 to 80 to move logo lower
    zIndex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: Colors.lightNavalBlue,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  loginButton: {
    marginTop: 20,
  },
  signupContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 100, // Add space between login button and signup section
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  signupButton: {
    width: '100%',
  },
});

export default LoginScreen;
