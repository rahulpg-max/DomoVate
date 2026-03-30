import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Alert, Platform, Linking, Vibration, Pressable, ScrollView, Animated, Easing, NativeModules
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import Zeroconf from 'react-native-zeroconf';
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";

const { WidgetModule } = NativeModules;
const SHELLY_CLOUD_URL = "https://shelly-233-eu.shelly.cloud"; 
const SHELLY_AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";
const zeroconf = new Zeroconf();

const THEMES = {
  dark: { bg: "#000000", headerBg: "#000000", inputBg: "#262626", text: "#FFFFFF", subText: "#A8A8A8", iconDefault: "#FFFFFF", accent: "#FFD700", danger: "#ED4956", cardBg: "#121212", cardBorder: "#262626", placeholder: "#888", activeCardBg: "#1A202C", modalBg: "#1E1E1E", shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 } },
  light: { bg: "#FFFFFF", headerBg: "#FFFFFF", inputBg: "#EFEFEF", text: "#000000", subText: "#8E8E8E", iconDefault: "#000000", accent: "#FFD700", danger: "#ED4956", cardBg: "#FFFFFF", cardBorder: "#DBDBDB", placeholder: "#999", activeCardBg: "#E3F2FD", modalBg: "#FFFFFF", shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } }
};

const TRANSLATIONS = {
  EN: { 
    searchPlaceholder: "Search devices...", turnOnAll: "Turn On All", turnOffAll: "Turn Off All", holdToTrigger: "Hold to Trigger", noResults: "No results found for", wifiReq: "Wi-Fi Connection Required", wifiSub: "You are not connected to Wi-Fi. Do you want to control devices remotely?", connectWifi: "Open Settings", ignore: "Out of Home", timerTitle: "Set Timer", timerSub: "Select duration", set: "Start Timer", stop: "Stop Timer", cancel: "Cancel", willTurnOffAt: "Action at: ", listening: "Listening...", processing: "Thinking...",
    flipState: "Flip State (Toggle)", runAndStop: "Run Now & Auto-Stop", cancelTimer: "Cancel Timer"
  },
  HIN: { 
    searchPlaceholder: "डिवाइस खोजें...", turnOnAll: "सभी चालू करें", turnOffAll: "सभी बंद करें", holdToTrigger: "दबा कर रखें", noResults: "इसके लिए कोई परिणाम नहीं:", wifiReq: "Wi-Fi आवश्यक है", wifiSub: "आप वाई-फाई से कनेक्ट नहीं हैं। क्या आप घर से बाहर कंट्रोल करना चाहते हैं?", connectWifi: "सेटिंग्स खोलें", ignore: "घर से बाहर", timerTitle: "टाइमर सेट करें", timerSub: "अवधि चुनें", set: "टाइमर शुरू करें", stop: "टाइमर रोकें", cancel: "रद्द करें", willTurnOffAt: "कार्य समय: ", listening: "सुन रही हूँ...", processing: "सोच रही हूँ...",
    flipState: "उल्टा करें (Toggle)", runAndStop: "चलाएं और बंद करें", cancelTimer: "टाइमर रद्द करें"
  }
};

export default function MasterControlScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [allDevices, setAllDevices] = useState([]); 
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [deviceStates, setDeviceStates] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");
  const [favorites, setFavorites] = useState([]);
  const [timers, setTimers] = useState({}); 
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [selectedDeviceForTimer, setSelectedDeviceForTimer] = useState(null);
  const [timerDuration, setTimerDuration] = useState(30);

  const allDevicesRef = useRef([]); 
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const deviceStatesRef = useRef(deviceStates);

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useEffect(() => {
    deviceStatesRef.current = deviceStates;
  }, [deviceStates]);

  useEffect(() => {
      allDevicesRef.current = allDevices;
  }, [allDevices]);

  useEffect(() => {
    const scan = () => {
        try {
            zeroconf.stop();
            zeroconf.scan('http', 'tcp', 'local.');
        } catch(e) {}
    };
    zeroconf.on('resolved', async (service) => {
        if (!service || !service.addresses || service.addresses.length === 0) return;
        const ip = service.addresses[0];
        let foundMac = null;
        if (service.txt && (service.txt.mac || service.txt.id)) {
             foundMac = service.txt.mac || service.txt.id;
        }
        if (!foundMac) {
             try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 2000);
                const res = await fetch(`http://${ip}/rpc/Shelly.GetDeviceInfo`, { signal: controller.signal });
                clearTimeout(id);
                if(res.ok) {
                    const json = await res.json();
                    foundMac = json.mac || json.id;
                } else {
                    const res1 = await fetch(`http://${ip}/settings`, { signal: controller.signal });
                    if(res1.ok) {
                        const json1 = await res1.json();
                        foundMac = json1.device.mac;
                    }
                }
             } catch(e) {}
        }
        if (foundMac) {
            const cleanMac = foundMac.replace(/[:-\s]/g, "").toLowerCase();
            const devices = allDevicesRef.current;
            const targetDeviceIndex = devices.findIndex(d => 
                (d.mac && d.mac.replace(/[:-\s]/g, "").toLowerCase() === cleanMac) ||
                (d.id === cleanMac)
            );
            if (targetDeviceIndex !== -1) {
                const device = devices[targetDeviceIndex];
                if (device.ip !== ip) {
                    const updatedDevice = { ...device, ip: ip };
                    const newAllDevices = [...devices];
                    newAllDevices[targetDeviceIndex] = updatedDevice;
                    setAllDevices(newAllDevices);
                    
                    const savedDevs = await AsyncStorage.getItem("DEVICES");
                    if (savedDevs) {
                        const parsed = JSON.parse(savedDevs);
                        const idx = parsed.findIndex(d => (d.id === device.id || d.name === device.name));
                        if(idx !== -1) {
                             parsed[idx] = updatedDevice;
                             await AsyncStorage.setItem("DEVICES", JSON.stringify(parsed));
                        }
                    }

                    const rawMap = await AsyncStorage.getItem("AREA_DEVICES");
                    let areaMap = rawMap ? JSON.parse(rawMap) : {};
                    let mapChanged = false;
                    Object.keys(areaMap).forEach(area => {
                          const areaDevIndex = areaMap[area].findIndex(d => 
                           (d.mac && d.mac.replace(/[:-\s]/g, "").toLowerCase() === cleanMac) || d.id === cleanMac
                          );
                          if(areaDevIndex !== -1) {
                              areaMap[area][areaDevIndex] = updatedDevice;
                              mapChanged = true;
                          }
                    });
                    if(mapChanged) {
                        await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(areaMap));
                    }
                }
            }
        }
    });
    scan();
    const interval = setInterval(scan, 10000); 
    return () => {
        clearInterval(interval);
        try {
            zeroconf.stop();
            zeroconf.removeDeviceListeners();
        } catch(e) {}
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsAndData();
      NetInfo.fetch().then(state => {
        if (state.type !== 'wifi' || !state.isConnected) showWifiAlert();
      });
      const interval = setInterval(() => {
          checkTimers();
          loadSettingsAndData(); 
      }, 1500); 
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => { filterList(); }, [searchTerm, allDevices]);

  const loadSettingsAndData = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
      const savedFavs = await AsyncStorage.getItem("FAVORITES");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      const savedTimers = await AsyncStorage.getItem("DEVICE_TIMERS");
      if (savedTimers) setTimers(JSON.parse(savedTimers));
      const areasRaw = await AsyncStorage.getItem("AREA_DEVICES");
      const statesRaw = await AsyncStorage.getItem("DEVICE_STATES");
      const devsRaw = await AsyncStorage.getItem("DEVICES"); 
      const areas = areasRaw ? JSON.parse(areasRaw) : {};
      const states = statesRaw ? JSON.parse(statesRaw) : {};
      
      let list = [];
      if (devsRaw) {
          list = JSON.parse(devsRaw);
      } else {
          Object.keys(areas).forEach(area => {
            const devices = areas[area];
            devices.forEach(dev => { list.push({ ...dev, areaName: area }); });
          });
      }
      
      const mappedList = list.map(d => {
          const areaName = d.area || "Unknown";
          return { ...d, areaName };
      });

      setAllDevices(mappedList);
      setDeviceStates(prev => ({...prev, ...states}));
    } catch (e) {} finally { setLoading(false); }
  };

  const showWifiAlert = () => {
    const currentT = TRANSLATIONS[language === "HIN" ? "HIN" : "EN"];
    Alert.alert(currentT.wifiReq, currentT.wifiSub, [{ text: currentT.ignore, style: "cancel" }, { text: currentT.connectWifi, onPress: openWifiSettings, style: "default" }], { cancelable: false });
  };

  const openWifiSettings = () => {
    if (Platform.OS === 'android') { Linking.sendIntent("android.settings.WIFI_SETTINGS"); } 
    else { Linking.openURL('App-Prefs:root=WIFI'); }
  };

  const filterList = () => {
    if (!searchTerm.trim()) { setFilteredDevices(allDevices); return; }
    const lower = searchTerm.toLowerCase();
    const results = allDevices.filter(d => d.name.toLowerCase().includes(lower) || d.type.toLowerCase().includes(lower) || (d.areaName && d.areaName.toLowerCase().includes(lower)));
    setFilteredDevices(results);
  };

  const checkTimers = async () => {
    setTimers(prevTimers => {
        const now = Date.now();
        let hasChanges = false;
        const newTimers = { ...prevTimers };
        Object.keys(newTimers).forEach(deviceId => {
            const timerData = newTimers[deviceId];
            let targetTime = 0;
            let actionType = 'TOGGLE';
            if (typeof timerData === 'number') {
                targetTime = timerData;
            } else {
                targetTime = timerData.time;
                actionType = timerData.type;
            }

            if (targetTime <= now) {
                triggerTimerAction(deviceId, actionType);
                delete newTimers[deviceId];
                hasChanges = true;
            }
        });
        if (hasChanges) {
            AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
            return newTimers;
        }
        return prevTimers;
    });
  };

  const triggerTimerAction = async (deviceId, type = 'TOGGLE') => {
      const currentState = !!deviceStatesRef.current[deviceId];
      let newState = !currentState;
      if (type === 'ON') newState = true;
      else if (type === 'OFF') newState = false;
      else newState = !currentState; 

      setDeviceStates(prevStates => {
          const next = { ...prevStates, [deviceId]: newState };
          AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
          return next;
      });

      const device = allDevicesRef.current.find(d => (d.id || d.name) === deviceId);
      if (device) {
          const success = await toggleDeviceLogic(device, newState ? "on" : "off", true);
          if (!success) {
              setDeviceStates(prevStates => {
                  const next = { ...prevStates, [deviceId]: currentState };
                  AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
                  return next;
              });
          }
      }
  };

  const getCleanCloudId = (device) => {
      let rawId = device.mac;
      if (!rawId) rawId = device.id;
      if (!rawId) return null;
      const strId = String(rawId).trim();
      if (strId.length === 13 && /^\d+$/.test(strId) && strId.startsWith("17")) return null; 
      if (/^\d+$/.test(strId)) {
          try {
              let hex = BigInt(strId).toString(16);
              return hex.toLowerCase();
          } catch(e) { return strId; }
      }
      return strId.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  };

  const toggleDeviceLogic = async (device, command, isBackground = false) => {
    if (!device) return false;
    let success = false;
    const key = device.id || device.name;
    
    if (device.ip && device.ip !== "MANUAL" && device.ip !== "WAITING") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800); 
        try {
            let response = await fetch(`http://${device.ip}/relay/0?turn=${command}`, { signal: controller.signal });
            if (response.ok) { clearTimeout(timeoutId); success = true; }
            if (!success) {
                const cmdBool = command === 'on' ? 'true' : 'false';
                response = await fetch(`http://${device.ip}/rpc/Switch.Set?id=0&on=${cmdBool}`, { signal: controller.signal });
                if(response.ok) { clearTimeout(timeoutId); success = true; }
            }
        } catch (e) {} finally { clearTimeout(timeoutId); }
    }

    if (!success) {
      const finalId = getCleanCloudId(device);
      if (finalId) {
        try {
            const formData = new FormData();
            formData.append('channel', '0');
            formData.append('turn', command);
            formData.append('id', finalId);
            formData.append('auth_key', SHELLY_AUTH_KEY);
            let response = await fetch(`${SHELLY_CLOUD_URL}/device/relay/control`, { 
                method: 'POST', body: formData 
            }); 
            let json = await response.json();
            if (json.isok) success = true;
            else {
                response = await fetch(`${SHELLY_CLOUD_URL}/device/light/control`, { 
                    method: 'POST', body: formData 
                });
                json = await response.json();
                if (json.isok) success = true;
            }
        } catch(e) {}
      }
    }
    
    if (success && !isBackground) {
      const newState = command === 'on';
      setDeviceStates(prev => {
          const next = { ...prev, [key]: newState };
          AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
          return next;
      });
      if (WidgetModule) WidgetModule.updateWidget(device.name, newState ? "ON" : "OFF");
    }
    return success;
  };

  const { isListening, isProcessing, lastSpoken, assistantReply, startListening, stopListening } = useVoiceAssistant(allDevices, toggleDeviceLogic, language, null, null);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const toggleSingle = async (device) => {
    Vibration.vibrate(50);
    const key = device.id || device.name;
    const currentState = !!deviceStates[key];
    const newState = !currentState;
    
    setDeviceStates(prev => {
        const next = { ...prev, [key]: newState };
        AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
        return next;
    });
    if (WidgetModule) WidgetModule.updateWidget(device.name, newState ? "ON" : "OFF");

    const command = newState ? "on" : "off";
    const success = await toggleDeviceLogic(device, command, true);
    if (!success) {
        setDeviceStates(prev => {
            const next = { ...prev, [key]: currentState };
            AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
            return next;
        });
        if (WidgetModule) WidgetModule.updateWidget(device.name, currentState ? "ON" : "OFF");
        Alert.alert("Failed", "Device unavailable");
    } else {
        if (!newState) {
            const newTimers = {...timers};
            if (newTimers[key]) {
                delete newTimers[key];
                setTimers(newTimers);
                AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
            }
        }
    }
  };

  const toggleFavorite = async (deviceId) => {
    let newFavs;
    if (favorites.includes(deviceId)) { newFavs = favorites.filter(id => id !== deviceId); } 
    else { newFavs = [...favorites, deviceId]; }
    setFavorites(newFavs);
    await AsyncStorage.setItem("FAVORITES", JSON.stringify(newFavs));
  };

  const openTimerModal = (device) => {
    setSelectedDeviceForTimer(device);
    setTimerDuration(30);
    setTimerModalVisible(true);
  };

  const adjustTimerDuration = (amount) => {
    setTimerDuration(prev => { const newVal = prev + amount; return newVal < 1 ? 1 : newVal; });
  };

  const setDeviceTimer = async (type) => {
    if (!selectedDeviceForTimer) return;
    const duration = timerDuration; 
    const targetTime = Date.now() + (duration * 60 * 1000);
    const deviceId = selectedDeviceForTimer.id || selectedDeviceForTimer.name;
    const command = (type === 'OFF' || type === 'RUN_STOP') ? 'off' : 'on';

    if (WidgetModule && WidgetModule.scheduleDeviceTimer) {
         if (type === 'RUN_STOP') await toggleSingle(selectedDeviceForTimer);
         WidgetModule.scheduleDeviceTimer(deviceId, command, duration);
         Alert.alert("Native Timer Set", `Device will turn ${command} in ${duration} mins`);
    } else {
        const timerObj = { time: targetTime, type: type === 'RUN_STOP' ? 'OFF' : type };
        const newTimers = { ...timers, [deviceId]: timerObj };
        setTimers(newTimers);
        await AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
        
        if (type === 'RUN_STOP') {
           if (!deviceStates[deviceId]) { 
             await toggleSingle(selectedDeviceForTimer); 
           }
        }
    }

    setTimerModalVisible(false);
    Vibration.vibrate(50);
  };

  const clearDeviceTimer = async () => {
    if (!selectedDeviceForTimer) return;
    const deviceId = selectedDeviceForTimer.id || selectedDeviceForTimer.name;
    const newTimers = { ...timers };
    delete newTimers[deviceId];
    setTimers(newTimers);
    await AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
    setTimerModalVisible(false);
    Vibration.vibrate(50);
  };

  const getRemainingTime = (deviceId) => {
    if (!timers[deviceId]) return null;
    let target = 0;
    if (typeof timers[deviceId] === 'number') target = timers[deviceId];
    else target = timers[deviceId].time;

    const diff = target - Date.now();
    if (diff <= 0) return null;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const turnAllOn = async () => {
    Vibration.vibrate(100);
    const updates = {};
    filteredDevices.forEach(d => { updates[d.id || d.name] = true; });
    setDeviceStates(prev => ({...prev, ...updates}));

    for (let i = 0; i < filteredDevices.length; i++) {
        const device = filteredDevices[i];
        const key = device.id || device.name;
        await new Promise(resolve => setTimeout(resolve, 150));
        const success = await toggleDeviceLogic(device, "on", true);
        if (!success) {
            setDeviceStates(prev => {
                const newState = {...prev};
                newState[key] = false; 
                return newState;
            });
        }
    }
    AsyncStorage.setItem("DEVICE_STATES", JSON.stringify({...deviceStates, ...updates}));
  };

  const turnAllOff = async () => {
    Vibration.vibrate(100);
    const updates = {};
    filteredDevices.forEach(d => { updates[d.id || d.name] = false; });
    setDeviceStates(prev => ({...prev, ...updates}));

    for (let i = 0; i < filteredDevices.length; i++) {
        const device = filteredDevices[i];
        const key = device.id || device.name;
        await new Promise(resolve => setTimeout(resolve, 150));
        const success = await toggleDeviceLogic(device, "off", true);
        if (!success) {
            setDeviceStates(prev => {
                const newState = {...prev};
                newState[key] = true; 
                return newState;
            });
        }
    }
    AsyncStorage.setItem("DEVICE_STATES", JSON.stringify({...deviceStates, ...updates}));
  };

  const getDeviceIconInfo = (name, type) => {
    const n = (name || "").toLowerCase();
    const tVal = (type || "").toLowerCase();
    if (n.includes("fan") || tVal.includes("fan")) return { icon: "aperture-outline", color: "#00E1FF" };
    if (n.includes("ac") || tVal.includes("ac")) return { icon: "snow-outline", color: "#80DEEA" };
    if (n.includes("tv") || tVal.includes("tv")) return { icon: "tv-outline", color: "#FFB74D" };
    if (n.includes("bulb") || n.includes("light")) return { icon: "bulb-outline", color: "#FFD700" };
    return { icon: "power-outline", color: "#9BB1FF" };
  };

  const getTargetTimeDisplay = () => {
    const target = Date.now() + (timerDuration * 60 * 1000);
    return new Date(target).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderVoiceModal = () => (
    <Modal visible={isListening || isProcessing} transparent animationType="slide">
      <View style={styles.voiceOverlay}>
        <SafeAreaView style={styles.voiceContent}>
          <TouchableOpacity style={styles.closeVoice} onPress={stopListening}>
            <Ionicons name="close-circle" size={45} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
          <View style={styles.voiceHeader}>
            <Text style={styles.assistantTitle}>DOMOVATE AI</Text>
            <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.voiceVisualizer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              {isProcessing ? <ActivityIndicator size="large" color="#000" /> : <Ionicons name="mic" size={50} color="#000" />}
            </Animated.View>
            <Text style={styles.voiceStatusText}>{isProcessing ? t.processing : t.listening}</Text>
          </View>
          <View style={styles.voiceTextContainer}>
            <Text style={styles.userSpeechText}>{lastSpoken || "..."}</Text>
            {assistantReply ? <View style={styles.aiReplyBox}><Text style={styles.aiReplyText}>{assistantReply}</Text></View> : null}
          </View>
          <View style={styles.voiceWaveform}>{[1, 2, 3, 4, 5, 6].map(i => <View key={i} style={[styles.waveBar, { height: 20 + Math.random() * 40 }]} />)}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );

  if (loading) return <View style={[styles.container, {backgroundColor: colors.bg, justifyContent: 'center'}]}><ActivityIndicator size="large" color={colors.accent}/></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="search" size={18} color={colors.subText} style={{marginLeft: 10}} />
            <TextInput style={[styles.input, { color: colors.text }]} placeholder={t.searchPlaceholder} placeholderTextColor={colors.placeholder} value={searchTerm} onChangeText={setSearchTerm} />
            {searchTerm.length > 0 && <TouchableOpacity onPress={() => setSearchTerm("")} style={{marginRight: 10}}><Ionicons name="close-circle" size={18} color={colors.subText} /></TouchableOpacity>}
        </View>
        <TouchableOpacity onPress={startListening} style={{marginLeft: 10}}><Ionicons name="mic" size={26} color={colors.accent} /></TouchableOpacity>
      </View>
      <View style={styles.masterPanel}>
        <View style={styles.masterRow}>
            <Pressable style={({pressed}) => [styles.masterCard, { backgroundColor: isDarkMode ? "#1A1A1A" : "#F5F5F5", borderColor: colors.accent, borderWidth: 1, opacity: pressed ? 0.8 : 1 }]} onLongPress={turnAllOn} delayLongPress={800} android_ripple={{color: colors.accent}}>
                <View style={[styles.masterIconCircle, {backgroundColor: "rgba(16, 185, 129, 0.2)"}]}><Ionicons name="power" size={24} color="#10B981" /></View>
                <View style={styles.masterTextCol}><Text style={[styles.masterTitle, {color: colors.text}]}>{t.turnOnAll}</Text><Text style={[styles.masterSub, {color: colors.subText}]}>{t.holdToTrigger}</Text></View>
            </Pressable>
            <Pressable style={({pressed}) => [styles.masterCard, { backgroundColor: isDarkMode ? "#1A1A1A" : "#F5F5F5", borderColor: colors.danger, borderWidth: 1, opacity: pressed ? 0.8 : 1 }]} onLongPress={turnAllOff} delayLongPress={800} android_ripple={{color: colors.danger}}>
                <View style={[styles.masterIconCircle, {backgroundColor: "rgba(237, 73, 86, 0.2)"}]}><Ionicons name="power" size={24} color={colors.danger} /></View>
                <View style={styles.masterTextCol}><Text style={[styles.masterTitle, {color: colors.text}]}>{t.turnOffAll}</Text><Text style={[styles.masterSub, {color: colors.subText}]}>{t.holdToTrigger}</Text></View>
            </Pressable>
        </View>
      </View>
      <FlatList 
        data={filteredDevices}
        keyExtractor={item => item.id || item.name}
        contentContainerStyle={{paddingBottom: 20, paddingHorizontal: 16}}
        renderItem={({item}) => {
            const key = item.id || item.name;
            const isOn = !!deviceStates[key];
            const { icon } = getDeviceIconInfo(item.name, item.type);
            const isFav = favorites.includes(key);
            const remaining = getRemainingTime(key);
            return (
              <View style={[styles.deviceCard, { backgroundColor: isOn ? colors.activeCardBg : colors.cardBg, borderColor: isOn ? colors.accent : colors.cardBorder, borderWidth: 1 }, colors.shadow]}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconBox, { backgroundColor: isOn ? "rgba(255, 215, 0, 0.15)" : (isDarkMode ? "rgba(255,255,255,0.1)" : "#f0f0f0") }]}><Ionicons name={icon} size={28} color={isOn ? "#FFD700" : colors.iconDefault} /></View>
                      <View style={{ marginLeft: 15 }}>
                        <Text style={[styles.deviceName, { color: colors.text }]}>{item.name}</Text>
                        {remaining ? <Text style={{color: colors.danger, fontSize: 12, fontWeight: 'bold'}}>Closing in: {remaining}</Text> : <Text style={[styles.deviceType, { color: colors.subText }]}>{item.areaName} • {item.ip === "WAITING" ? "Scanning..." : item.ip}</Text>}
                      </View>
                    </View>
                    <TouchableOpacity style={[styles.powerBtn, { backgroundColor: isOn ? colors.accent : (isDarkMode ? "#2E3A66" : "#E0E0E0") }]} onPress={() => toggleSingle(item)}><Ionicons name="power" size={22} color={isOn ? "#fff" : colors.subText} /></TouchableOpacity>
                </View>
                <View style={[styles.deviceActionRow, { borderTopColor: colors.cardBorder }]}>
                    <TouchableOpacity style={styles.miniBtn} onPress={() => openTimerModal(item)}><Ionicons name="time-outline" size={18} color={remaining ? colors.danger : colors.subText} />{remaining && <Text style={{fontSize:10, color: colors.danger, marginLeft: 4}}>ACTIVE</Text>}</TouchableOpacity>
                    <TouchableOpacity style={[styles.miniBtn, {marginLeft: 15}]} onPress={() => toggleFavorite(key)}><Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? colors.danger : colors.subText} /></TouchableOpacity>
                </View>
              </View>
            );
        }}
        ListEmptyComponent={<View style={{alignItems:'center', marginTop: 50}}><View style={{width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.text, justifyContent: 'center', alignItems: 'center', marginBottom: 15}}><Ionicons name="search-outline" size={30} color={colors.text} /></View><Text style={{textAlign:'center', color: colors.text, fontWeight: 'bold'}}>{t.noResults}</Text><Text style={{textAlign:'center', color: colors.subText, marginTop: 5}}>"{searchTerm}"</Text></View>}
      />
      <Modal visible={timerModalVisible} transparent animationType="fade" onRequestClose={() => setTimerModalVisible(false)}>
          <View style={styles.adminModalWrap}><View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
            <View style={styles.timerHeader}><Ionicons name="timer-outline" size={24} color={colors.accent} /><Text style={[styles.adminTitle, {color: colors.text, marginBottom: 0, marginLeft: 10}]}>{t.timerTitle}</Text></View>
            <Text style={[styles.targetTimeText, {color: colors.subText}]}>{t.willTurnOffAt} <Text style={{color: colors.accent, fontWeight: 'bold'}}>{getTargetTimeDisplay()}</Text></Text>
            <View style={styles.timerPickerContainer}><TouchableOpacity style={[styles.adjustBtn, {borderColor: colors.cardBorder}]} onPress={() => adjustTimerDuration(-5)}><Ionicons name="remove" size={24} color={colors.text} /></TouchableOpacity><View style={styles.timerDisplay}><Text style={[styles.timerValue, {color: colors.text}]}>{timerDuration}</Text><Text style={[styles.timerUnit, {color: colors.subText}]}>min</Text></View><TouchableOpacity style={[styles.adjustBtn, {borderColor: colors.cardBorder}]} onPress={() => adjustTimerDuration(5)}><Ionicons name="add" size={24} color={colors.text} /></TouchableOpacity></View>
            <View style={styles.presetContainer}>{[10, 30, 60, 120].map(m => (<TouchableOpacity key={m} style={[styles.presetChip, {backgroundColor: timerDuration === m ? colors.accent : colors.inputBg}]} onPress={() => setTimerDuration(m)}><Text style={{color: timerDuration === m ? "#FFF" : colors.text, fontWeight: '600'}}>{m}m</Text></TouchableOpacity>))}</View>
            
            <TouchableOpacity style={[styles.modalBtn, {marginTop: 20, backgroundColor: colors.accent, width: '100%', height: 65, justifyContent: 'center'}]} onPress={() => setDeviceTimer('TOGGLE')}>
                <Text style={styles.modalBtnText}>{t.flipState}</Text>
                <Text style={{color: '#000', fontSize: 11, marginTop: 2, fontWeight: '500', opacity: 0.8}}>Status Change: (ON ➔ OFF) or (OFF ➔ ON)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: '#2E3A66', width: '100%', height: 65, justifyContent: 'center'}]} onPress={() => setDeviceTimer('RUN_STOP')}>
                <Text style={styles.modalBtnText}>{t.runAndStop}</Text>
                <Text style={{color: '#FFF', fontSize: 11, marginTop: 2, fontWeight: '400', opacity: 0.8}}>Turn ON Now ➔ Turn OFF when timer ends</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: '#10B981', width: '100%', height: 65, justifyContent: 'center'}]} onPress={() => setDeviceTimer('OFF')}>
                <Text style={styles.modalBtnText}>Force Turn OFF</Text>
                <Text style={{color: '#FFF', fontSize: 11, marginTop: 2, fontWeight: '400', opacity: 0.8}}>Ensure device turns OFF at target time</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: colors.danger, width: '100%', height: 55, justifyContent: 'center'}]} onPress={clearDeviceTimer}>
                <Text style={styles.modalBtnText}>{t.cancelTimer}</Text>
                <Text style={{color: '#FFF', fontSize: 10, marginTop: 1, opacity: 0.9}}>Remove active schedule</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: colors.inputBg, width: '100%'}]} onPress={()=>setTimerModalVisible(false)}><Text style={[styles.modalBtnText, {color: colors.text}]}>{t.cancel}</Text></TouchableOpacity></View></View>
      </Modal>
      {renderVoiceModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  backBtn: { padding: 5, marginRight: 15 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, height: 36 },
  input: { flex: 1, marginLeft: 10, fontSize: 16, paddingVertical: 0 },
  masterPanel: { padding: 16 },
  masterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  masterCard: { width: '48%', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  masterIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  masterTextCol: { flex: 1 },
  masterTitle: { fontSize: 14, fontWeight: 'bold' },
  masterSub: { fontSize: 10, marginTop: 2 },
  deviceCard: { padding: 12, borderRadius: 12, marginBottom: 12, flexDirection: 'column' },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 15, fontWeight: "600" },
  deviceType: { fontSize: 11 },
  powerBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  deviceActionRow: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, justifyContent: 'flex-start', alignItems: 'center' },
  miniBtn: { padding: 4, flexDirection: 'row', alignItems: 'center' },
  adminModalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  adminModal: { width: "85%", padding: 25, borderRadius: 24, elevation: 10 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  adminTitle: { fontSize: 20, fontWeight: "700" },
  targetTimeText: { textAlign: 'center', marginBottom: 20, fontSize: 14 },
  timerPickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  adjustBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  timerDisplay: { width: 100, alignItems: 'center' },
  timerValue: { fontSize: 36, fontWeight: 'bold' },
  timerUnit: { fontSize: 14 },
  presetContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  presetChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", alignSelf: 'center' },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  voiceOverlay: { flex: 1, backgroundColor: "#050919", justifyContent: 'center' },
  voiceContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 },
  closeVoice: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
  voiceHeader: { alignItems: 'center', marginTop: 20 },
  assistantTitle: { color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(237, 73, 86, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ED4956', marginRight: 6 },
  liveText: { color: '#ED4956', fontSize: 10, fontWeight: 'bold' },
  pulseCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', elevation: 15 },
  voiceStatusText: { color: '#FFD700', marginTop: 25, fontSize: 16, fontWeight: '600' },
  voiceTextContainer: { width: '85%', alignItems: 'center' },
  userSpeechText: { color: '#FFFFFF', fontSize: 26, fontWeight: '600', textAlign: 'center', lineHeight: 34 },
  aiReplyBox: { marginTop: 25, padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, width: '100%' },
  aiReplyText: { color: '#A8A8A8', fontSize: 18, textAlign: 'center', lineHeight: 26 },
  voiceWaveform: { flexDirection: 'row', alignItems: 'flex-end', height: 60, marginBottom: 20 },
  waveBar: { width: 4, backgroundColor: '#FFD700', marginHorizontal: 3, borderRadius: 2 },
});