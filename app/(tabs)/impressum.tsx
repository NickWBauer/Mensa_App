import React from 'react';
import { StyleSheet, Text, View } from 'react-native';



export default function impressum() {
    return (
        <View style={styles.container}>
            <Text style={styles.content}>impressum</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
    },
    content: {
        fontSize: 22,
        textAlign: "center",
    }
});

