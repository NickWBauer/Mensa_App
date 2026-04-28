import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo1: {
    width: 160,
    height: 150,
    resizeMode: 'contain',
  },
  logo2: {
    width: 120,
    height: 110,
    resizeMode: 'contain',
  },
});

export default function LogoHeader() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/Logo_Studierendenwerk_Stuttgart.png')}
          style={styles.logo1}
        />
        <Image
          source={require('@/assets/images/Logo_Hs_Esslingen.png')}
          style={styles.logo2}
        />
      </View>
    </View>
  );
}
