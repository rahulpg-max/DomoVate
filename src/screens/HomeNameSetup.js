import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, KeyboardAvoidingView
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
    danger: "#ED4956",
    border: "#262626",
    placeholder: "#888",
    icon: "#FFFFFF"
  },
  light: {
    bg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    inputBg: "#EFEFEF",
    accent: "#0095F6",
    danger: "#ED4956",
    border: "#DBDBDB",
    placeholder: "#999",
    icon: "#000000"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "Set Home Name",
    sub: "This name will appear on your dashboard.",
    placeholder: "Enter Home Name",
    btn: "Continue",
    error: "Home name must be at least 3 characters.",
    lang: "EN"
  },
  HIN: {
    title: "घर का नाम सेट करें",
    sub: "यह नाम आपके डैशबोर्ड पर दिखाई देगा।",
    placeholder: "घर का नाम दर्ज करें",
    btn: "आगे बढ़ें",
    error: "घर का नाम कम से कम 3 अक्षरों का होना चाहिए।",
    lang: "HI"
  }
};

export default function HomeNameSetupScreen({ navigation }) {
  const [homeName, setHomeName] = useState("");
  const [error, setError] = useState("");
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

  const toggleTheme = async () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem("THEME_MODE", newMode ? "dark" : "light");
  };

  const toggleLanguage = async () => {
      const newLang = language === "EN" ? "HIN" : "EN";
      setLanguage(newLang);
      await AsyncStorage.setItem("LANGUAGE", newLang);
  };

  const saveHomeName = async () => {
    if (homeName.trim().length < 3) {
      setError(t.error);
      return;
    }
    await AsyncStorage.setItem("home_name", homeName.trim());
    navigation.replace("SetupPinStep1");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
            <Ionicons name="globe-outline" size={20} color={colors.text} />
            <Text style={[styles.langText, {color: colors.text}]}>{t.lang}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleTheme}>
            <Ionicons name={isDarkMode ? "sunny-outline" : "moon-outline"} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { borderColor: colors.text }]}>
                <Ionicons name="home-outline" size={40} color={colors.text} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.subText }]}>{t.sub}</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder={t.placeholder}
                    placeholderTextColor={colors.placeholder}
                    value={homeName}
                    onChangeText={(t) => {
                        setHomeName(t);
                        setError("");
                    }}
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
                />
            </View>

            {error !== "" && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={saveHomeName}>
                <Text style={styles.buttonText}>{t.btn}</Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  topBar: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      paddingHorizontal: 20, 
      paddingTop: Platform.OS === 'android' ? 20 : 10,
      zIndex: 10
  },
  langBtn: { flexDirection: 'row', alignItems: 'center' },
  langText: { marginLeft: 5, fontWeight: 'bold' },

  content: { flex: 1, justifyContent: "center", padding: 25 },
  
  centerBox: { alignItems: 'center', width: '100%' },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },

  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 30 },

  inputContainer: { width: '100%', marginBottom: 15 },
  input: { padding: 15, borderRadius: 12, fontSize: 18, textAlign: "center" },

  error: { textAlign: "center", marginBottom: 15, fontWeight: 'bold' },

  button: { paddingVertical: 15, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});