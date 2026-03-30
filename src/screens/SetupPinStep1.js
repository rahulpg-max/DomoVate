import React, { useState, useCallback } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";

const THEMES = {
  dark: {
    bg: "#000000",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    inputBg: "#262626",
    accent: "#0095F6",
    border: "#262626",
    placeholder: "#888"
  },
  light: {
    bg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    inputBg: "#EFEFEF",
    accent: "#0095F6",
    border: "#DBDBDB",
    placeholder: "#999"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "Create PIN",
    sub: "Create a 4-digit PIN to secure your home.",
    next: "Next",
    error: "Error",
    pinLength: "PIN must be 4 digits"
  },
  HIN: {
    title: "पिन बनाएं",
    sub: "अपने घर को सुरक्षित करने के लिए 4 अंकों का पिन बनाएं।",
    next: "आगे बढ़ें",
    error: "त्रुटि",
    pinLength: "पिन 4 अंकों का होना चाहिए"
  }
};

export default function SetupPinStep1({ navigation }) {
  const [pin, setPin] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useFocusEffect(
    useCallback(() => {
        loadSettings();
    }, [])
  );

  const loadSettings = async () => {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
  };

  const handleNext = () => {
    if (pin.length !== 4) { 
        Alert.alert(t.error, t.pinLength); 
        return; 
    }
    navigation.navigate("SetupPinStep2", { firstPin: pin });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
        <View style={styles.content}>
            <View style={[styles.iconCircle, { borderColor: colors.text }]}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.text} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>{t.sub}</Text>

            <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]} 
                keyboardType="numeric" 
                maxLength={4} 
                secureTextEntry 
                value={pin} 
                onChangeText={setPin} 
                placeholder="••••" 
                placeholderTextColor={colors.placeholder} 
                autoFocus
            />

            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={handleNext}>
                <Text style={styles.btnText}>{t.next}</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 20 },
  content: { alignItems: 'center', width: '100%' },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 30, maxWidth: '80%' },
  
  input: { width: '100%', padding: 15, borderRadius: 12, fontSize: 24, textAlign: "center", letterSpacing: 10, marginBottom: 20 },
  
  btn: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" }
});