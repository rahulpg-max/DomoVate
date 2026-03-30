import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, 
  Keyboard, TouchableWithoutFeedback, StatusBar, Platform 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";

const MAX_ATTEMPTS = 5;
const BASE_LOCK_TIME = 5 * 60 * 1000;

const THEMES = {
  dark: {
    bg: "#000000",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    inputBg: "#262626",
    accent: "#0095F6",
    danger: "#ED4956",
    placeholder: "#888"
  },
  light: {
    bg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    inputBg: "#EFEFEF",
    accent: "#0095F6",
    danger: "#ED4956",
    placeholder: "#999"
  }
};

const TRANSLATIONS = {
  EN: {
    welcome: "Welcome Back",
    locked: "App Locked",
    tryAgain: "Try again in:",
    forgot: "Forgot PIN?",
    enter: "Enter",
    error: "Error",
    pin4: "PIN must be 4 digits",
    wrong: "Wrong PIN",
    attemptsLeft: "Attempts left:"
  },
  HIN: {
    welcome: "वापसी पर स्वागत है",
    locked: "ऐप लॉक है",
    tryAgain: "पुनः प्रयास करें:",
    forgot: "पिन भूल गए?",
    enter: "दर्ज करें",
    error: "त्रुटि",
    pin4: "पिन 4 अंकों का होना चाहिए",
    wrong: "गलत पिन",
    attemptsLeft: "प्रयास बचे हैं:"
  }
};

export default function EnterHomePinScreen({ navigation }) {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(""); 
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const timerRef = useRef(null);

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useFocusEffect(
    useCallback(() => {
        loadSettings();
        checkLockState();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [])
  );

  const loadSettings = async () => {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
  };

  const checkLockState = async () => {
    try {
      const savedUnlockTime = await AsyncStorage.getItem("lock_until_time");
      const savedAttempts = await AsyncStorage.getItem("failed_attempts");

      if (savedAttempts) setAttempts(parseInt(savedAttempts));

      if (savedUnlockTime) {
        const unlockTime = parseInt(savedUnlockTime);
        if (Date.now() < unlockTime) {
          setIsLocked(true);
          startTimer(unlockTime);
        } else {
          resetLockState(false);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const startTimer = (unlockTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    updateTimerText(unlockTime);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (now >= unlockTime) {
        clearInterval(timerRef.current);
        resetLockState(false); 
      } else {
        updateTimerText(unlockTime);
      }
    }, 1000);
  };

  const updateTimerText = (unlockTime) => {
    const remaining = unlockTime - Date.now();
    if (remaining <= 0) return;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    setTimeLeft(`${minutes}m ${seconds}s`);
  };

  const triggerLockout = async () => {
    setIsLocked(true);
    Keyboard.dismiss();
    
    const savedDuration = await AsyncStorage.getItem("current_lock_duration");
    let lockDuration = savedDuration ? parseInt(savedDuration) * 3 : BASE_LOCK_TIME;
    const unlockTime = Date.now() + lockDuration;

    await AsyncStorage.setItem("lock_until_time", unlockTime.toString());
    await AsyncStorage.setItem("current_lock_duration", lockDuration.toString());
    startTimer(unlockTime);
  };

  const resetLockState = async (fullReset) => {
    setIsLocked(false);
    setPin("");
    if (timerRef.current) clearInterval(timerRef.current);

    if (fullReset) {
      setAttempts(0);
      await AsyncStorage.multiRemove(["lock_until_time", "failed_attempts", "current_lock_duration"]);
    } else {
      setAttempts(0);
      await AsyncStorage.setItem("failed_attempts", "0");
      await AsyncStorage.removeItem("lock_until_time");
    }
  };

  const handleLogin = async () => {
    if (isLocked) return;
    if (pin.length !== 4) { Alert.alert(t.error, t.pin4); return; }

    const savedPin = await AsyncStorage.getItem("home_pin");

    if (savedPin && pin.trim() === savedPin) {
      await resetLockState(true);
      Keyboard.dismiss();
      navigation.replace("Dashboard");
    } else {
      setPin("");
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      await AsyncStorage.setItem("failed_attempts", newAttempts.toString());

      if (newAttempts >= MAX_ATTEMPTS) {
        triggerLockout(); 
      } else {
        Alert.alert(t.wrong, `${t.attemptsLeft} ${MAX_ATTEMPTS - newAttempts}`);
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, {backgroundColor: colors.bg}]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        
        <View style={styles.iconContainer}>
            <View style={[styles.lockIconCircle, {borderColor: colors.text}]}>
                <Ionicons name={isLocked ? "lock-closed" : "lock-open"} size={40} color={colors.text} />
            </View>
        </View>

        <Text style={[styles.title, {color: colors.text}]}>{isLocked ? t.locked : t.welcome}</Text>
        
        {isLocked ? (
           <View style={{alignItems: 'center'}}>
             <Text style={[styles.timerLabel, {color: colors.danger}]}>{t.tryAgain}</Text>
             <Text style={[styles.timerText, {color: colors.text}]}>{timeLeft}</Text>
             
             <TouchableOpacity onPress={() => navigation.navigate("ForgotPin")}>
                <Text style={[styles.link, {color: colors.subText}]}>{t.forgot}</Text>
             </TouchableOpacity>
           </View>
        ) : (
           <View style={{width: '100%', alignItems: 'center'}}>
            <TextInput 
              style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text}]} 
              keyboardType="numeric" 
              maxLength={4} 
              secureTextEntry 
              value={pin} 
              onChangeText={setPin} 
              placeholder="••••" 
              placeholderTextColor={colors.placeholder} 
            />
            
            <TouchableOpacity style={[styles.btn, {backgroundColor: colors.accent}]} onPress={handleLogin}>
              <Text style={styles.btnText}>{t.enter}</Text>
            </TouchableOpacity>
           </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, alignItems: 'center' },
  
  iconContainer: { marginBottom: 30 },
  lockIconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  title: { fontSize: 24, marginBottom: 40, fontWeight: 'bold' },
  
  input: { padding: 15, borderRadius: 12, fontSize: 24, textAlign: "center", letterSpacing: 10, marginBottom: 20, width: '80%' },
  
  btn: { paddingVertical: 15, borderRadius: 12, width: '80%', alignItems: 'center' },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  timerLabel: { fontSize: 16, marginBottom: 10 },
  timerText: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  
  link: { marginTop: 10, fontSize: 14, textDecorationLine: 'underline' }
});