import React, { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Alert, SafeAreaView, StatusBar, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";

const THEMES = {
  dark: {
    bg: "#000000",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    cardBg: "#121212",
    inputBg: "#262626",
    accent: "#0095F6",
    border: "#262626",
    placeholder: "#888",
    modalBg: "#262626",
    danger: "#ED4956"
  },
  light: {
    bg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    cardBg: "#FFFFFF",
    inputBg: "#EFEFEF",
    accent: "#0095F6",
    border: "#DBDBDB",
    placeholder: "#999",
    modalBg: "#FFFFFF",
    danger: "#ED4956"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "Security & Recovery",
    sub: "Select a question to recover your PIN if forgotten.",
    selectQ: "Select a Security Question",
    ansPlace: "Your Answer",
    finish: "Finish Setup",
    chooseQ: "Choose a Question",
    cancel: "Cancel",
    errorQ: "Please select a question.",
    errorAns: "Answer is too short.",
    errorSave: "Failed to save data.",
    success: "Success",
    setupDone: "Setup Completed Successfully!",
    goDash: "Go to Dashboard"
  },
  HIN: {
    title: "सुरक्षा और रिकवरी",
    sub: "पिन भूलने पर रिकवरी के लिए एक प्रश्न चुनें।",
    selectQ: "सुरक्षा प्रश्न चुनें",
    ansPlace: "आपका उत्तर",
    finish: "सेटअप समाप्त करें",
    chooseQ: "एक प्रश्न चुनें",
    cancel: "रद्द करें",
    errorQ: "कृपया एक प्रश्न चुनें।",
    errorAns: "उत्तर बहुत छोटा है।",
    errorSave: "डेटा सहेजने में विफल।",
    success: "सफल",
    setupDone: "सेटअप सफलतापूर्वक पूरा हुआ!",
    goDash: "डैशबोर्ड पर जाएं"
  }
};

const SECURITY_QUESTIONS = [
  "What is the name of your first pet?",
  "What is your mother's maiden name?",
  "What was your first car?",
  "Which city were you born in?",
  "What is your favorite food?",
  "What is your childhood nickname?"
];

export default function SetupSecurityScreen({ navigation }) {
  const [question, setQuestion] = useState(null); 
  const [answer, setAnswer] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
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

  const saveAll = async () => {
    if (!question) {
      setError(t.errorQ);
      return;
    }
    if (answer.trim().length < 2) {
      setError(t.errorAns);
      return;
    }

    try {
      await AsyncStorage.setItem("security_question", question);
      await AsyncStorage.setItem("security_answer", answer.trim());
      await AsyncStorage.setItem("is_setup_complete", "true");

      Alert.alert(t.success, t.setupDone, [
        { text: t.goDash, onPress: () => navigation.replace("Dashboard") }
      ]);
      
    } catch (e) {
      setError(t.errorSave);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t.sub}</Text>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          
          <TouchableOpacity 
            style={[styles.dropdownButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]} 
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.dropdownText, { color: question ? colors.text : colors.placeholder }]}>
                {question || t.selectQ}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.subText} />
          </TouchableOpacity>

          <TextInput
            placeholder={t.ansPlace}
            placeholderTextColor={colors.placeholder}
            value={answer}
            onChangeText={(t) => {
              setAnswer(t);
              setError("");
            }}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          />

          {error !== "" && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={saveAll}>
            <Text style={styles.buttonText}>{t.finish}</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.chooseQ}</Text>
              
              <FlatList
                data={SECURITY_QUESTIONS}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.modalItem, { borderBottomColor: colors.border }]} 
                    onPress={() => {
                      setQuestion(item);
                      setModalVisible(false);
                      setError("");
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
              
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.closeText, { color: colors.danger }]}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 25, justifyContent: "center" },
  
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  subtitle: { textAlign: "center", marginBottom: 30 },
  
  card: { padding: 25, borderRadius: 16, borderWidth: 1 },
  
  dropdownButton: {
    padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 15,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center"
  },
  dropdownText: { fontSize: 16, flex: 1 },

  input: { padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, marginBottom: 15 },
  
  error: { textAlign: "center", marginBottom: 10, fontWeight: 'bold' },
  
  button: { paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center", fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 20 },
  modalContainer: { borderRadius: 15, padding: 20, maxHeight: "60%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1 },
  modalItemText: { fontSize: 16 },
  closeButton: { marginTop: 15, alignItems: "center", padding: 10 },
  closeText: { fontSize: 16, fontWeight: "bold" },
});