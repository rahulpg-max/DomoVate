import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Platform } from "react-native";
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
    icon: "#FFFFFF"
  },
  light: {
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    accent: "#0095F6",
    border: "#DBDBDB",
    icon: "#000000"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "Help & Support",
    q1: "Q: How to add device?",
    a1: "A: Go to Settings > Admin Mode > Scan Devices. Ensure your ESP32/8266 is connected to the same Wi-Fi.",
    q2: "Q: Forgot PIN?",
    a2: "A: Use the \"Forgot PIN\" option on the lock screen. It will ask for the Universal Recovery Code.",
    q3: "Q: App not scanning?",
    a3: "A: Ensure \"Location\" and \"Nearby Devices\" permissions are allowed in Android Settings.",
    q4: "Q: How to create rooms?",
    a4: "A: Go to Settings > Admin Mode > Manage Areas. You can add, rename, or delete areas there."
  },
  HIN: {
    title: "सहायता और समर्थन",
    q1: "प्र: डिवाइस कैसे जोड़ें?",
    a1: "उ: सेटिंग्स > एडमिन मोड > स्कैन डिवाइस पर जाएं। सुनिश्चित करें कि आपका ESP32/8266 उसी वाई-फाई से जुड़ा है।",
    q2: "प्र: पिन भूल गए?",
    a2: "उ: लॉक स्क्रीन पर \"पिन भूल गए\" विकल्प का उपयोग करें। यह यूनिवर्सल रिकवरी कोड मांगेगा।",
    q3: "प्र: ऐप स्कैन नहीं कर रहा?",
    a3: "उ: सुनिश्चित करें कि एंड्रॉइड सेटिंग्स में \"लोकेशन\" और \"नजदीकी डिवाइस\" की अनुमति दी गई है।",
    q4: "प्र: कमरे कैसे बनाएं?",
    a4: "उ: सेटिंग्स > एडमिन मोड > एरिया प्रबंधित करें पर जाएं। आप वहां एरिया जोड़, नाम बदल या हटा सकते हैं।"
  }
};

export default function HelpScreen({ navigation }) {
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

      <ScrollView style={styles.content} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.qaBlock}>
            <Text style={[styles.question, { color: colors.text }]}>{t.q1}</Text>
            <Text style={[styles.answer, { color: colors.subText }]}>{t.a1}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.qaBlock}>
            <Text style={[styles.question, { color: colors.text }]}>{t.q2}</Text>
            <Text style={[styles.answer, { color: colors.subText }]}>{t.a2}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.qaBlock}>
            <Text style={[styles.question, { color: colors.text }]}>{t.q3}</Text>
            <Text style={[styles.answer, { color: colors.subText }]}>{t.a3}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.qaBlock}>
            <Text style={[styles.question, { color: colors.text }]}>{t.q4}</Text>
            <Text style={[styles.answer, { color: colors.subText }]}>{t.a4}</Text>
        </View>
      </ScrollView>
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
  content: { flex: 1, padding: 20 },
  qaBlock: { marginVertical: 15 },
  question: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  answer: { fontSize: 14, lineHeight: 22 },
  divider: { height: 0.5, width: '100%', marginVertical: 5 }
});