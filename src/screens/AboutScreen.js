import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';

const THEMES = {
  dark: {
    bg: "#000000",
    headerBg: "#000000",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    accent: "#0095F6",
    border: "#262626",
    circleBg: "#262626",
    icon: "#FFFFFF"
  },
  light: {
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    accent: "#0095F6",
    border: "#DBDBDB",
    circleBg: "#EFEFEF",
    icon: "#000000"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "About",
    version: "Version 1.0.0",
    desc: "Innovating your home with secure, local, and fast automation control.",
    copy: "© 2025 DomoVate Inc."
  },
  HIN: {
    title: "के बारे में",
    version: "संस्करण 1.0.0",
    desc: "सुरक्षित, स्थानीय और तेज़ स्वचालन नियंत्रण के साथ आपके घर में नवाचार।",
    copy: "© 2025 DomoVate Inc."
  }
};

export default function AboutScreen({ navigation }) {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <View style={{width: 30}} />
      </View>

      <View style={styles.center}>
        <View style={[styles.logoCircle, { backgroundColor: colors.circleBg }]}>
            <Ionicons name="flash" size={50} color={colors.accent} />
        </View>
        
        <Text style={[styles.appName, { color: colors.text }]}>DomoVate</Text>
        <Text style={[styles.version, { color: colors.subText }]}>{t.version}</Text>
        
        <Text style={[styles.desc, { color: colors.text }]}>
            {t.desc}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={{flexDirection: 'row', marginTop: 20}}>
            <Ionicons name="logo-instagram" size={24} color={colors.subText} style={{marginHorizontal: 10}} />
            <Ionicons name="logo-twitter" size={24} color={colors.subText} style={{marginHorizontal: 10}} />
            <Ionicons name="globe-outline" size={24} color={colors.subText} style={{marginHorizontal: 10}} />
        </View>

        <Text style={[styles.copy, { color: colors.subText }]}>{t.copy}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16, 
    paddingTop: Platform.OS === 'android' ? 16 : 16,
    borderBottomWidth: 0.5 
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 28, fontWeight: "bold", letterSpacing: 1 },
  version: { fontSize: 16, marginVertical: 10 },
  desc: { textAlign: 'center', fontSize: 16, marginTop: 10, lineHeight: 24, maxWidth: '80%' },
  
  divider: { width: 50, height: 4, borderRadius: 2, marginTop: 30 },
  copy: { position: 'absolute', bottom: 40, fontSize: 12 }
});