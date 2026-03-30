import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";

const THEMES = {
  dark: {
    bg: "#000000",
    headerBg: "#000000",
    cardBg: "#121212",
    inputBg: "#262626",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    accent: "#0095F6",
    danger: "#ED4956",
    border: "#262626",
    divider: "#262626",
    placeholder: "#888"
  },
  light: {
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    inputBg: "#EFEFEF",
    text: "#000000",
    subText: "#8E8E8E",
    accent: "#0095F6",
    danger: "#ED4956",
    border: "#DBDBDB",
    divider: "#DBDBDB",
    placeholder: "#999"
  }
};

const TRANSLATIONS = {
  EN: {
    forgotTitle: "Forgot PIN?",
    forgotSub: "Answer security question to reset.",
    secQuestion: "Security Question",
    enterAns: "Enter your answer",
    verifyReset: "Verify & Reset",
    or: "OR",
    resetUniversal: "Reset via Universal PIN",
    masterTitle: "Master Reset",
    masterSub: "Enter the Master Universal PIN.",
    backSec: "Back to Security Question",
    enterUni: "Enter Universal PIN (****)",
    incorrect: "Incorrect Answer",
    tryAgain: "Please try again or use Universal PIN.",
    invalid: "Invalid PIN",
    uniIncorrect: "The Universal PIN is incorrect."
  },
  HIN: {
    forgotTitle: "पिन भूल गए?",
    forgotSub: "रीसेट करने के लिए सुरक्षा प्रश्न का उत्तर दें।",
    secQuestion: "सुरक्षा प्रश्न",
    enterAns: "अपना उत्तर दर्ज करें",
    verifyReset: "सत्यापित और रीसेट करें",
    or: "या",
    resetUniversal: "यूनिवर्सल पिन से रीसेट करें",
    masterTitle: "मास्टर रीसेट",
    masterSub: "मास्टर यूनिवर्सल पिन दर्ज करें।",
    backSec: "सुरक्षा प्रश्न पर वापस",
    enterUni: "यूनिवर्सल पिन दर्ज करें (****)",
    incorrect: "गलत उत्तर",
    tryAgain: "कृपया पुनः प्रयास करें या यूनिवर्सल पिन का उपयोग करें।",
    invalid: "अमान्य पिन",
    uniIncorrect: "यूनिवर्सल पिन गलत है।"
  }
};

export default function ForgotPinScreen({ navigation }) {
  const [step, setStep] = useState("loading");
  const [storedQuestion, setStoredQuestion] = useState("");
  const [storedAnswer, setStoredAnswer] = useState("");
  
  const [inputAnswer, setInputAnswer] = useState("");
  const [universalInput, setUniversalInput] = useState("");

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const MASTER_UNIVERSAL_PIN = "rahul"; 

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useFocusEffect(
    useCallback(() => {
        loadSettings();
        loadSecurityData();
    }, [])
  );

  const loadSettings = async () => {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
  };

  const loadSecurityData = async () => {
    try {
      const question = await AsyncStorage.getItem("security_question");
      const answer = await AsyncStorage.getItem("security_answer");
      if (question && answer) {
        setStoredQuestion(question);
        setStoredAnswer(answer);
        setStep("security_check");
      } else {
        setStep("universal_check");
      }
    } catch (error) {
      setStep("universal_check");
    }
  };

  const clearLockoutAndReset = async () => {
    try {
        await AsyncStorage.multiRemove([
            "lock_until_time", 
            "failed_attempts", 
            "current_lock_duration"
        ]);
        
        await AsyncStorage.setItem("is_setup_complete", "false");
        
        navigation.replace("HomeNameSetup");
    } catch (e) {
        console.error("Error clearing lock:", e);
    }
  };

  const handleVerifyAnswer = async () => {
    if (inputAnswer.trim().toLowerCase() === storedAnswer.trim().toLowerCase()) {
      await clearLockoutAndReset(); 
    } else {
      Alert.alert(t.incorrect, t.tryAgain);
    }
  };

  const handleVerifyUniversal = async () => {
    if (universalInput.trim() === MASTER_UNIVERSAL_PIN) {
      await clearLockoutAndReset(); 
    } else {
      Alert.alert(t.invalid, t.uniIncorrect);
    }
  };

  if (step === "loading") {
    return (
      <View style={[styles.container, {backgroundColor: colors.bg, alignItems:'center'}]}>
          <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.container, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        
        {step === "security_check" && (
          <>
            <Text style={[styles.title, {color: colors.text}]}>{t.forgotTitle}</Text>
            <Text style={[styles.subtitle, {color: colors.subText}]}>{t.forgotSub}</Text>
            
            <View style={[styles.card, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
              <Text style={[styles.label, {color: colors.accent}]}>{t.secQuestion}</Text>
              <Text style={[styles.questionText, {color: colors.text}]}>{storedQuestion}</Text>
              
              <TextInput 
                style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
                placeholder={t.enterAns}
                placeholderTextColor={colors.placeholder} 
                value={inputAnswer} 
                onChangeText={setInputAnswer} 
              />
            </View>

            <TouchableOpacity style={[styles.primaryButton, {backgroundColor: colors.accent}]} onPress={handleVerifyAnswer}>
              <Text style={[styles.buttonText, {color: '#fff'}]}>{t.verifyReset}</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, {backgroundColor: colors.divider}]} />
              <Text style={[styles.orText, {color: colors.subText}]}>{t.or}</Text>
              <View style={[styles.divider, {backgroundColor: colors.divider}]} />
            </View>

            <TouchableOpacity style={[styles.secondaryButton, {borderColor: colors.danger}]} onPress={() => setStep("universal_check")}>
              <Text style={[styles.secondaryButtonText, {color: colors.danger}]}>{t.resetUniversal}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "universal_check" && (
          <>
            <TouchableOpacity onPress={() => setStep("security_check")} style={styles.backLink}>
              <Ionicons name="arrow-back" size={20} color={colors.subText} />
              <Text style={[styles.backLinkText, {color: colors.subText}]}>{t.backSec}</Text>
            </TouchableOpacity>

            <Text style={[styles.title, {color: colors.text}]}>{t.masterTitle}</Text>
            <Text style={[styles.subtitle, {color: colors.subText}]}>{t.masterSub}</Text>
            
            <View style={[styles.card, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
                <TextInput 
                    style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
                    placeholder={t.enterUni}
                    placeholderTextColor={colors.placeholder} 
                    keyboardType="default" 
                    autoCapitalize="none" 
                    secureTextEntry 
                    value={universalInput} 
                    onChangeText={setUniversalInput} 
                />
            </View>

            <TouchableOpacity style={[styles.primaryButton, {backgroundColor: colors.accent}]} onPress={handleVerifyUniversal}>
              <Text style={[styles.buttonText, {color: '#fff'}]}>{t.verifyReset}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  header: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  backBtn: { padding: 5 },
  
  contentContainer: { width: "100%" },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 5 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 30 },
  
  card: { padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 8 },
  questionText: { fontSize: 18, marginBottom: 20, fontStyle: "italic" },
  
  input: { borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1 },
  
  primaryButton: { paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "bold" },
  
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 25 },
  divider: { flex: 1, height: 1 },
  orText: { paddingHorizontal: 10, fontSize: 12, fontWeight: "bold" },
  
  secondaryButton: { paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" },
  secondaryButtonText: { fontSize: 14, fontWeight: "600" },
  
  backLink: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backLinkText: { marginLeft: 8, fontSize: 14 },
});