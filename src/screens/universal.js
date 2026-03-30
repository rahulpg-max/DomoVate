import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback, Keyboard, Modal, Alert, StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useFocusEffect } from '@react-navigation/native';

const UNIVERSAL_PIN = "rahul";
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; 

const THEMES = {
  dark: {
    bg: "#000000", text: "#FFFFFF", subText: "#A8A8A8", cardBg: "#121212",
    inputBg: "#262626", accent: "#0095F6", danger: "#ED4956", border: "#262626",
    placeholder: "#888", scanBtnBg: "#EFEFEF", scanBtnText: "#000000"
  },
  light: {
    bg: "#FFFFFF", text: "#000000", subText: "#8E8E8E", cardBg: "#FFFFFF",
    inputBg: "#EFEFEF", accent: "#0095F6", danger: "#ED4956", border: "#DBDBDB",
    placeholder: "#999", scanBtnBg: "#262626", scanBtnText: "#FFFFFF"
  }
};

const TRANSLATIONS = {
  EN: {
    title: "DomoVate", sub: "Innovating Home", enterPin: "Enter Universal PIN",
    unlock: "Unlock", or: "OR", scan: "Scan Setup QR", tryAgain: "Try again in:",
    permTitle: "Permission Denied", permMsg: "Camera access is needed.",
    invalidQR: "Invalid QR", invalidMsg: "Invalid Home Setup data.",
    error: "Error", failQR: "Failed to parse QR.", success: "Success",
    imported: "Home Setup Imported Successfully!", goDash: "Go to Dashboard",
    scanTitle: "Scan Admin QR Code", closeScan: "Close Scanner", lang: "EN",
    enterName: "Enter Your Name", namePlaceholder: "e.g. Rahul", proceed: "Proceed"
  },
  HIN: {
    title: "DomoVate", sub: "घर में नवाचार", enterPin: "यूनिवर्सल पिन दर्ज करें",
    unlock: "अनलॉक करें", or: "या", scan: "सेटअप QR स्कैन करें", tryAgain: "पुनः प्रयास करें:",
    permTitle: "अनुमति अस्वीकृत", permMsg: "कैमरा एक्सेस की आवश्यकता है।",
    invalidQR: "अमान्य QR", invalidMsg: "डेटा मान्य नहीं है।",
    error: "त्रुटि", failQR: "QR विफल रहा।", success: "सफल",
    imported: "सेटअप सफलतापूर्वक आयात किया गया!", goDash: "डैशबोर्ड पर जाएं",
    scanTitle: "QR कोड स्कैन करें", closeScan: "बंद करें", lang: "HI",
    enterName: "अपना नाम दर्ज करें", namePlaceholder: "जैसे: राहुल", proceed: "आगे बढ़ें"
  }
};

export default function UniversalPinScreen({ navigation }) {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");
  
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [pendingQrData, setPendingQrData] = useState(null);

  const timerRef = useRef(null);
  const device = useCameraDevice('back');
  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;
  
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (isScannerOpen && codes.length > 0 && codes[0].value) {
        setPendingQrData(codes[0].value);
        setIsScannerOpen(false);
        setIsNameModalOpen(true);
      }
    }
  });

  useFocusEffect(
    useCallback(() => {
        loadSettings();
        loadLockState();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  const loadLockState = async () => {
    try {
      const savedAttempts = await AsyncStorage.getItem("universal_attempts");
      const savedUnlockTime = await AsyncStorage.getItem("universal_unlock_time");
      if (savedAttempts) setAttempts(parseInt(savedAttempts, 10) || 0);
      if (savedUnlockTime) {
        const unlockTimeValue = parseInt(savedUnlockTime, 10);
        if (Date.now() < unlockTimeValue) {
          setIsLocked(true);
          startTimer(unlockTimeValue);
        } else {
          resetLock();
        }
      }
    } catch (error) { console.error(error); }
  };

  const resetLock = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsLocked(false);
    setAttempts(0);
    setTimeLeft("");
    await AsyncStorage.multiRemove(["universal_attempts", "universal_unlock_time"]);
  };

  const startTimer = (unlockAt) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const diff = unlockAt - Date.now();
      if (diff <= 0) { clearInterval(timerRef.current); resetLock(); } 
      else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }, 1000);
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    if (pin.trim().toLowerCase() === UNIVERSAL_PIN) {
      Keyboard.dismiss();
      await resetLock();
      await AsyncStorage.setItem("universal_verified", "true");
      await AsyncStorage.setItem("is_setup_complete", "false"); 
      await AsyncStorage.setItem("setup_method", "universal_pin");
      navigation.replace("HomeNameSetup");
      return;
    }
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setPin("");
    await AsyncStorage.setItem("universal_attempts", newAttempts.toString());
    if (newAttempts >= MAX_ATTEMPTS) {
      const unlockAt = Date.now() + LOCK_TIME;
      setIsLocked(true);
      await AsyncStorage.setItem("universal_unlock_time", unlockAt.toString());
      startTimer(unlockAt);
    }
  };

  const handleOpenScanner = async () => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') setIsScannerOpen(true);
    else Alert.alert(t.permTitle, t.permMsg);
  };

  const onQRCodeReadConfirmed = async () => {
    if (!userName.trim()) {
      Alert.alert(t.error, t.enterName);
      return;
    }

    try {
      const parsedData = JSON.parse(pendingQrData);
      
      if (parsedData.h && parsedData.a) {
        const homeName = parsedData.h;
        const minifiedAreaMap = parsedData.a;
        const reconstructedAreaMap = {};
        let allDevices = [];

        Object.keys(minifiedAreaMap).forEach(areaName => {
            const devicesInArea = minifiedAreaMap[areaName].map((miniDev) => {
                return {
                    id: miniDev.i + "_" + Math.random().toString(36).substr(2, 4),
                    name: miniDev.n,
                    localName: miniDev.n,
                    ip: miniDev.i,
                    type: miniDev.t
                };
            });
            reconstructedAreaMap[areaName] = devicesInArea;
            allDevices = [...allDevices, ...devicesInArea];
        });

        const uniqueDevices = [...new Map(allDevices.map(item => [item.ip, item])).values()];
        
        const rawUsers = await AsyncStorage.getItem("ACTIVE_USERS");
        const userList = rawUsers ? JSON.parse(rawUsers) : [];
        const now = new Date();
        const newUser = {
          name: userName,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        userList.push(newUser);

        const pairs = [
            ["home_name", homeName],
            ["AREA_DEVICES", JSON.stringify(reconstructedAreaMap)],
            ["DEVICES", JSON.stringify(uniqueDevices)],
            ["ACTIVE_USERS", JSON.stringify(userList)],
            ["is_setup_complete", "true"], 
            ["universal_verified", "true"],
            ["setup_method", "qr_scan"]
        ];

        await AsyncStorage.multiSet(pairs);
        await resetLock();
        setIsNameModalOpen(false);

        Alert.alert(t.success, t.imported, [
          { text: t.goDash, onPress: () => navigation.replace("Dashboard") }
        ]);
      } else {
        Alert.alert(t.invalidQR, t.invalidMsg);
        setIsNameModalOpen(false);
      }
    } catch (e) {
      Alert.alert(t.error, t.failQR);
      setIsNameModalOpen(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.container, {backgroundColor: colors.bg}]}>
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

        <View style={styles.headerContainer}>
          <Text style={[styles.title, {color: colors.text}]}>{t.title}</Text>
          <Text style={[styles.subtitle, {color: colors.subText}]}>{t.sub}</Text>
        </View>

        <View style={[styles.card, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
            <Text style={[styles.cardTitle, {color: colors.text}]}>{t.enterPin}</Text>
            {isLocked ? (
                <Text style={[styles.lockText, {color: colors.danger}]}>{t.tryAgain}{"\n"}{timeLeft}</Text>
            ) : (
                <>
                <TextInput 
                    placeholder="••••" 
                    placeholderTextColor={colors.placeholder} 
                    value={pin} 
                    onChangeText={setPin} 
                    secureTextEntry 
                    style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
                />
                <TouchableOpacity style={[styles.button, {backgroundColor: colors.accent}]} onPress={handleSubmit}>
                    <Text style={[styles.buttonText, {color: '#fff'}]}>{t.unlock}</Text>
                </TouchableOpacity>
                <View style={{marginVertical: 15}}><Text style={{color: colors.subText}}>{t.or}</Text></View>
                <TouchableOpacity style={[styles.scanBtn, {backgroundColor: colors.scanBtnBg}]} onPress={handleOpenScanner}>
                    <Ionicons name="qr-code-outline" size={20} color={colors.scanBtnText} style={{marginRight: 8}} />
                    <Text style={[styles.scanBtnText, {color: colors.scanBtnText}]}>{t.scan}</Text>
                </TouchableOpacity>
                </>
            )}
        </View>

        <Modal visible={isScannerOpen} animationType="slide" onRequestClose={() => setIsScannerOpen(false)}>
            <View style={{flex: 1, backgroundColor: 'black'}}>
                {device != null && <Camera style={StyleSheet.absoluteFill} device={device} isActive={isScannerOpen} codeScanner={codeScanner} />}
                <View style={styles.overlay} pointerEvents="none"><View style={styles.scanFrame} /><Text style={{color:'#fff', marginTop:20, backgroundColor:'rgba(0,0,0,0.5)', padding:5}}>{t.scanTitle}</Text></View>
                <TouchableOpacity style={styles.closeScanBtn} onPress={() => setIsScannerOpen(false)}><Text style={{color: 'white', fontWeight: 'bold'}}>{t.closeScan}</Text></TouchableOpacity>
            </View>
        </Modal>

        <Modal visible={isNameModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.card, {backgroundColor: colors.cardBg, width: '85%'}]}>
              <Text style={[styles.cardTitle, {color: colors.text}]}>{t.enterName}</Text>
              <TextInput 
                placeholder={t.namePlaceholder} 
                placeholderTextColor={colors.placeholder} 
                value={userName} 
                onChangeText={setUserName} 
                style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text}]} 
              />
              <TouchableOpacity style={[styles.button, {backgroundColor: colors.accent}]} onPress={onQRCodeReadConfirmed}>
                <Text style={[styles.buttonText, {color: '#fff'}]}>{t.proceed}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{marginTop: 15}} onPress={() => {setIsNameModalOpen(false); setUserName("");}}>
                <Text style={{color: colors.danger}}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  topBar: { position: 'absolute', top: Platform.OS === 'android' ? 20 : 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  langBtn: { flexDirection: 'row', alignItems: 'center' },
  langText: { marginLeft: 5, fontWeight: 'bold' },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 34, fontWeight: "700" },
  subtitle: { fontSize: 16 },
  card: { width: "100%", padding: 25, borderRadius: 20, alignItems:'center', borderWidth: 1 },
  cardTitle: { fontSize: 20, marginBottom: 20, fontWeight: '600' },
  input: { borderRadius: 12, padding: 15, fontSize: 18, width: '100%', marginBottom: 15, textAlign: "center", borderWidth: 1 },
  button: { paddingVertical: 15, borderRadius: 12, width: '100%', alignItems:'center' },
  buttonText: { fontSize: 18, fontWeight: "600" },
  scanBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 12, width: '100%' },
  scanBtnText: { fontSize: 16, fontWeight: 'bold' },
  closeScanBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(255,0,0,0.7)', padding: 15, borderRadius: 10 },
  lockText: { fontSize: 18, textAlign: 'center', fontWeight:'bold' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }
});