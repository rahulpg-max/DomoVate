import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function PrivacyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.text}>
          1. **Data Storage**: All your home data (PIN, Devices, Settings) is stored LOCALLY on your phone using Encrypted Storage. We do not upload data to any cloud server.{'\n\n'}
          2. **Network**: The app uses Local Wi-Fi (Zeroconf/mDNS) to communicate with ESP32 devices. No internet is required for operation.{'\n\n'}
          3. **Permissions**: We only ask for Location/Nearby Devices permission to scan for your local hardware.{'\n\n'}
          4. **Security**: Your PIN is hashed and stored securely.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071226" },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth:1, borderColor:'#1D2442' },
  backBtn: { padding: 8, backgroundColor: '#131A33', borderRadius: 8, marginRight: 15 },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  content: { padding: 20 },
  text: { color: "#8fa1d4", fontSize: 16, lineHeight: 24 }
});