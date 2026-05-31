import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

type LogoHeaderProps = {
  showDateTime?: boolean;
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  logo1: {
    width: 150,
    height: 100,
    resizeMode: 'contain',
  },
  logo2: {
    width: 120,
    height: 90,
    resizeMode: 'contain',
  },
  infoRow: {
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  dateBlock: {
    flex: 1,
    paddingRight: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    lineHeight: 20,
  },
  openOrdersText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    textAlign: 'right',
  },
});

export default function LogoHeader({ showDateTime }: LogoHeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!showDateTime) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [showDateTime]);

  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
  const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/Logo_Studierendenwerk_Stuttgart.png')}
          style={styles.logo1}
        />
        <Image
          source={require('@/assets/images/Logo_Hs_Esslingen.jpg')}
          style={styles.logo2}
        />
      </View>
      {showDateTime ? (
        <View style={styles.infoRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.infoText}>{dateLabel}</Text>
            <Text style={styles.infoText}>{timeLabel}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
