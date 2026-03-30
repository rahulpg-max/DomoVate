import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Share,
  ScrollView,
  Keyboard,
  Linking,
  Platform,
  Dimensions,
  RefreshControl,
  Switch,
  Vibration,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  NativeModules
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from "react-native-vector-icons/Ionicons";
import RNFS from 'react-native-fs';
import NetInfo from "@react-native-community/netinfo";
import Zeroconf from 'react-native-zeroconf';
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { DeviceEventEmitter } from 'react-native';
const { WidgetModule } = NativeModules;
const SHELLY_CLOUD_URL = "https://shelly-233-eu.shelly.cloud";
const SHELLY_AUTH_KEY = "M2I5ZDNidWlkDE0CE3CE8E285355F35159C6C0AE7503CA7F72435F6FD6E3B5E8848A16B87DC637B15E4216B18832";
const BASE_LOCK_TIME = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const { width } = Dimensions.get('window');
const zeroconf = new Zeroconf();

const THEMES = {
  dark: {
    bg: "#000000",
    contentBg: "#000000",
    headerBg: "#000000",
    footerBg: "#000000",
    cardBg: "#121212",
    cardBorder: "#262626",
    text: "#FFFFFF",
    headerText: "#FFFFFF",
    subText: "#A8A8A8",
    iconDefault: "#FFFFFF",
    modalBg: "#1E1E1E",
    inputBg: "#121212",
    accent: "#FFD700",
    danger: "#ED4956",
    shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 }
  },
  light: {
    bg: "#FFFFFF",
    contentBg: "#FFFFFF",
    headerBg: "#FFFFFF",
    footerBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardBorder: "#DBDBDB",
    text: "#000000",
    headerText: "#000000",
    subText: "#8E8E8E",
    iconDefault: "#000000",
    modalBg: "#FFFFFF",
    inputBg: "#EFEFEF",
    accent: "#FFD700",
    danger: "#ED4956",
    shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }
  }
};

const TRANSLATIONS = {
  EN: {
    noDevices: "No devices found.",
    settings: "Settings",
    language: "Language",
    wifiReq: "Wi-Fi Connection Required",
    wifiSub: "You are not connected to Wi-Fi. Do you want to control devices remotely?",
    connectWifi: "Open Settings",
    ignore: "Out of Home",
    adminMode: "Admin Mode",
    backup: "Backup & Restore",
    weatherSet: "Weather Setup",
    privacy: "Privacy & Security",
    help: "Help & Support",
    about: "About App",
    noArea: "No Areas Setup",
    goAdmin: "Triple tap Settings icon to setup.",
    cancel: "Cancel",
    verify: "Verify",
    enterPin: "Enter Home PIN",
    backupTitle: "Backup & Restore",
    shareBackup: "Share / Drive",
    saveBackup: "Save to File",
    close: "Close",
    appLocked: "System Locked",
    tryAgain: "Try again in:",
    forgotPin: "Forgot PIN?",
    favorites: "Favorites",
    noFavorites: "No favorite devices yet.",
    timerTitle: "Set Timer",
    set: "Start Timer",
    stop: "Stop Timer",
    gm: "Good Morning",
    ga: "Good Afternoon",
    ge: "Good Evening",
    options: "Options",
    addFav: "Add to Favorites",
    remFav: "Remove Favorite",
    willTurnOffAt: "Action at: ",
    energy: "Energy",
    fav: "Favs",
    control: "Control",
    setBtn: "Settings",
    listening: "Listening...",
    processing: "Thinking...",
    flipState: "Flip State (Toggle)",
    runAndStop: "Run Now & Auto-Stop",
    cancelTimer: "Cancel Timer",
    syncWidget: "Add to Home Screen",
    selectLayout: "Select Widget Design",
    pickDevice: "Pick a Device first"
  },
  HIN: {
    noDevices: "कोई डिवाइस नहीं मिला।",
    settings: "सेटिंग्स",
    language: "भाषा",
    wifiReq: "Wi-Fi आवश्यक है",
    wifiSub: "आप वाई-फाई से कनेक्ट नहीं हैं। क्या आप घर से बाहर कंट्रोल करना चाहते हैं?",
    connectWifi: "सेटिंग्स खोलें",
    ignore: "घर से बाहर",
    adminMode: "एडमिन मोड",
    backup: "बैकअप और रीस्टोर",
    weatherSet: "मौसम सेटअप",
    privacy: "गोपनीयता और सुरक्षा",
    help: "सहायता और समर्थन",
    about: "ऐप के बारे में",
    noArea: "कोई एरिया नहीं है",
    goAdmin: "सेटिंग्स आइकन पर तीन बार टैप करें।",
    cancel: "रद्द करें",
    verify: "वेरिफाई",
    enterPin: "होम पिन डालें",
    backupTitle: "बैकअप और रीस्टोर",
    shareBackup: "शेयर / ड्राइव",
    saveBackup: "फाइल सेव करें",
    close: "बंद करें",
    appLocked: "सिस्टम लॉक है",
    tryAgain: "पुनः प्रयास करें:",
    forgotPin: "पिन भूल गए?",
    favorites: "पसंदीदा",
    noFavorites: "कोई पसंदीदा डिवाइस नहीं।",
    timerTitle: "टाइमर सेट करें",
    set: "टाइमर शुरू करें",
    stop: "टाइमर रोकें",
    gm: "शुभ प्रभात",
    ga: "शुभ दोपहर",
    ge: "शुभ संध्या",
    options: "विकल्प",
    addFav: "पसंदीदा में जोड़ें",
    remFav: "पसंदीदा से हटाएं",
    willTurnOffAt: "कार्य समय: ",
    energy: "ऊर्जा",
    fav: "पसंदीदा",
    control: "कंट्रोल",
    setBtn: "सेटिंग्स",
    listening: "मैं सुन रही हूँ...",
    processing: "सोच रही हूँ...",
    flipState: "उल्टा करें (Toggle)",
    runAndStop: "चलाएं और बंद करें",
    cancelTimer: "टाइमर रद्द करें",
    syncWidget: "होम स्क्रीन पर जोड़ें",
    selectLayout: "विजेट डिज़ाइन चुनें",
    pickDevice: "पहले डिवाइस चुनें"
  }
};

export default function DashboardScreen({ navigation, route, widgetId }) {
  const [homeName, setHomeName] = useState("domovate_home");
  const [areaDevices, setAreaDevices] = useState({});
  const [allDevices, setAllDevices] = useState([]);
  const [deviceStates, setDeviceStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [isWifiConnected, setIsWifiConnected] = useState(true);
  const [timers, setTimers] = useState({});
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [selectedDeviceForTimer, setSelectedDeviceForTimer] = useState(null);
  const [timerDuration, setTimerDuration] = useState(30);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedDeviceForOptions, setSelectedDeviceForOptions] = useState(null);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [language, setLanguage] = useState("EN");
  const [backupLoading, setBackupLoading] = useState(false);
  const [greeting, setGreeting] = useState({ text: "", icon: "sunny-outline", color: "#FFD700" });
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [weatherConfig, setWeatherConfig] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [energyData, setEnergyData] = useState({ total: 0 }); 
  const [refreshing, setRefreshing] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [widgetLayoutModalVisible, setWidgetLayoutModalVisible] = useState(false);

  const timerRef = useRef(null);
  const settingsTapRef = useRef({ count: 0, lastTime: 0 });
  const clockIntervalRef = useRef(null);
  const allDevicesRef = useRef(allDevices);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const deviceStatesRef = useRef(deviceStates);

  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;
  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const currentConfigWidgetId = widgetId || route.params?.widgetId;

  const updateUsageLogs = async (deviceId, isTurningOn) => {
      try {
          const now = Date.now();
          const logsRaw = await AsyncStorage.getItem("DEVICE_USAGE_LOGS");
          const logs = logsRaw ? JSON.parse(logsRaw) : {};
          if (!logs[deviceId]) logs[deviceId] = { totalMilliseconds: 0, lastUpdate: now };
          if (isTurningOn) {
              logs[deviceId].lastUpdate = now;
          } else {
              const lastTime = logs[deviceId].lastUpdate || now;
              const diff = now - lastTime;
              if (diff > 0 && diff < 86400000) { 
                  logs[deviceId].totalMilliseconds = (logs[deviceId].totalMilliseconds || 0) + diff;
                  const hourlyRaw = await AsyncStorage.getItem("DEVICE_HOURLY_LOGS");
                  const hourly = hourlyRaw ? JSON.parse(hourlyRaw) : {};
                  if (!hourly[deviceId]) hourly[deviceId] = {};
                  const d = new Date();
                  const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}`;
                  hourly[deviceId][key] = (hourly[deviceId][key] || 0) + diff;
                  await AsyncStorage.setItem("DEVICE_HOURLY_LOGS", JSON.stringify(hourly));
              }
              logs[deviceId].lastUpdate = now;
          }
          await AsyncStorage.setItem("DEVICE_USAGE_LOGS", JSON.stringify(logs));
      } catch (e) { console.log("Log Error", e); }
  };

  const toggleDeviceLogic = async (device, command, isBackground = false) => {
    if (!device) return false;
    let success = false;
    if (!isBackground && device.ip && device.ip !== "MANUAL" && device.ip !== "WAITING") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800); 
        try {
            let response = await fetch(`http://${device.ip}/relay/0?turn=${command}`, { signal: controller.signal });
            if (response.ok) {
                clearTimeout(timeoutId);
                return true;
            }
            if (!response.ok) {
                const cmdBool = command === 'on' ? 'true' : 'false';
                response = await fetch(`http://${device.ip}/rpc/Switch.Set?id=0&on=${cmdBool}`, { signal: controller.signal });
                if(response.ok) {
                    clearTimeout(timeoutId);
                    return true;
                }
            }
        } catch (e) {
        } finally {
            clearTimeout(timeoutId);
        }
    }
    try {
        const formData = new FormData();
        formData.append('channel', '0');
        formData.append('turn', command);
        formData.append('id', device.id);
        formData.append('auth_key', SHELLY_AUTH_KEY);
        const response = await fetch(`${SHELLY_CLOUD_URL}/device/relay/control`, {
            method: 'POST',
            body: formData
        });
        const json = await response.json();
        if (json.isok) success = true;
    } catch(e) {}
    return success;
  };

  const { isListening, isProcessing, lastSpoken, assistantReply, startListening, stopListening } = useVoiceAssistant(allDevices, toggleDeviceLogic, language, weatherData, energyData);

  useEffect(() => {
    deviceStatesRef.current = deviceStates;
  }, [deviceStates]);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  useEffect(() => {
    if (currentConfigWidgetId) {
      Alert.alert(t.timerTitle, t.pickDevice);
    }
  }, [currentConfigWidgetId]);

  useEffect(() => {
    if (route.params?.view) {
        setActiveTab(route.params.view);
        navigation.setParams({ view: null });
    }
  }, [route.params]);

  useEffect(() => {
      const unsubscribe = NetInfo.addEventListener(state => {
          const hasWifi = state.type === 'wifi' && state.isConnected;
          setIsWifiConnected(hasWifi);
          if (!hasWifi) showWifiAlert();
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      allDevicesRef.current = allDevices;
  }, [allDevices]);

  useEffect(() => {
    const scan = () => {
        try {
            zeroconf.stop();
            zeroconf.scan('http', 'tcp', 'local.');
            setScannerActive(true);
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
                    await AsyncStorage.setItem("DEVICES", JSON.stringify(newAllDevices));
                    const rawMap = await AsyncStorage.getItem("AREA_DEVICES");
                    let areaMap = rawMap ? JSON.parse(rawMap) : {};
                    let mapChanged = false;
                    if(areaMap[device.area]) {
                        const areaDevIndex = areaMap[device.area].findIndex(d => 
                          (d.mac && d.mac.replace(/[:-\s]/g, "").toLowerCase() === cleanMac) || d.id === cleanMac
                        );
                        if(areaDevIndex !== -1) {
                            areaMap[device.area][areaDevIndex] = updatedDevice;
                            mapChanged = true;
                        }
                    }
                    if(mapChanged) {
                        setAreaDevices(areaMap);
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
      loadAll();
      checkLockState();
      updateGreeting();
      loadWeather();
      const interval = setInterval(() => {
          updateGreeting();
          checkTimers();
      }, 1000);
      clockIntervalRef.current = interval;
      return () => clearInterval(interval);
    }, [language])
  );

useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onStatusUpdate', (data) => {
      setDeviceStates(prev => {
        const next = { ...prev, [data.deviceId]: data.status === "ON" };
        AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
        return next;
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
  const subscription = DeviceEventEmitter.addListener('onStatusUpdate', (data) => {
    setDeviceStates(prev => {
      let next = { ...prev };
      
      if (data.deviceId === "ALL_DEVICES") {
        allDevices.forEach(dev => {
          const isLight = dev.name && dev.name.toLowerCase().includes("light");
          if (isLight) {
            next[dev.id] = data.status === "ON";
          }
        });
      } else {
        next[data.deviceId] = data.status === "ON";
      }

      AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
      return next;
    });
  });

  return () => subscription.remove();
}, [allDevices]); 
  const loadWeather = async () => {
    try {
      const configRaw = await AsyncStorage.getItem("WEATHER_CONFIG");
      if (!configRaw) {
        setWeatherConfig(null);
        setWeatherData(null);
        return;
      }
      const config = JSON.parse(configRaw);
      setWeatherConfig(config);
      await fetchWeatherData(config.latitude, config.longitude);
    } catch (e) {}
  };

  const fetchWeatherData = async (lat, lon) => {
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      const weatherJson = await weatherRes.json();
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`;
      const aqiRes = await fetch(aqiUrl);
      const aqiJson = await aqiRes.json();
      if (weatherJson && weatherJson.current) {
        setWeatherData({
          temp: weatherJson.current.temperature_2m,
          code: weatherJson.current.weather_code,
          humid: weatherJson.current.relative_humidity_2m,
          aqi: (aqiJson && aqiJson.current) ? aqiJson.current.us_aqi : null
        });
      }
    } catch (e) {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
        zeroconf.stop();
        zeroconf.scan('http', 'tcp', 'local.');
    } catch(e) {}
    if (weatherConfig) {
      await fetchWeatherData(weatherConfig.latitude, weatherConfig.longitude);
    }
    await loadAll();
    setRefreshing(false);
  }, [weatherConfig]);

  const getWeatherIcon = (code) => {
    if (code === 0) return { name: "sunny", color: "#FFD700", label: "Clear" };
    if (code >= 1 && code <= 3) return { name: "partly-sunny", color: "#FF8C00", label: "Partly Cloudy" };
    if (code >= 45 && code <= 48) return { name: "cloud", color: "#A0A0A0", label: "Foggy" };
    if (code >= 51 && code <= 67) return { name: "rainy", color: "#6E8CD7", label: "Rain" };
    if (code >= 71 && code <= 77) return { name: "snow", color: "#00E1FF", label: "Snow" };
    if (code >= 95) return { name: "thunderstorm", color: "#7B68EE", label: "Storm" };
    return { name: "cloud-outline", color: colors.subText, label: "Cloudy" };
  };

  const getAqiColor = (aqi) => {
    if (aqi === null || aqi === undefined) return colors.subText;
    if (aqi <= 50) return "#00E400";
    if (aqi <= 100) return "#FFFF00";
    if (aqi <= 150) return "#FF7E00";
    if (aqi <= 200) return "#FF0000";
    return "#7e0023";
  };

  const showWifiAlert = () => {
    const currentT = TRANSLATIONS[language === "HIN" ? "HIN" : "EN"];
    Alert.alert(
      currentT.wifiReq,
      currentT.wifiSub,
      [
        { text: currentT.ignore, style: "cancel" },
        { text: currentT.connectWifi, onPress: openWifiSettings, style: "default" }
      ],
      { cancelable: false }
    );
  };

  const openWifiSettings = () => {
      if (Platform.OS === 'android') Linking.sendIntent("android.settings.WIFI_SETTINGS");
      else Linking.openURL('App-Prefs:root=WIFI');
  };

  const updateGreeting = () => {
      const h = new Date().getHours();
      let text, icon, color;
      if (h >= 5 && h < 12) { text = t.gm; icon = "sunny"; color = "#FFD700"; }
      else if (h >= 12 && h < 17) { text = t.ga; icon = "partly-sunny"; color = "#FF8C00"; }
      else { text = t.ge; icon = "moon"; color = "#6E8CD7"; }
      setGreeting({ text, icon, color });
  };
  const loadAll = async () => {
    try {
      const hn = await AsyncStorage.getItem("home_name");
      if (hn) setHomeName(hn);
      const lang = await AsyncStorage.getItem("LANGUAGE");
      setLanguage((lang === "EN" || lang === "HIN") ? lang : "EN");

      const ds = await AsyncStorage.getItem("DEVICES");
      const parsedDevs = ds ? JSON.parse(ds) : []; // 
      setAllDevices(parsedDevs);

      const hallLight = parsedDevs.find(d => d.name && d.name.toLowerCase().includes("hall light"));
      if (hallLight && WidgetModule && WidgetModule.saveTileData) {
          WidgetModule.saveTileData("hall_light_id", hallLight.id);
      }
      const lightsData = parsedDevs
      .filter(d => d.name && d.name.toLowerCase().includes("light"))
     .map(d => ({ id: d.id, ip: d.ip })); // ID aur IP dono le rahe hain

    if (WidgetModule && WidgetModule.saveTileData) {
    WidgetModule.saveTileData("all_lights_full_data", JSON.stringify(lightsData));
    }
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedFavs = await AsyncStorage.getItem("FAVORITES");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      const savedTimers = await AsyncStorage.getItem("DEVICE_TIMERS");
      if (savedTimers) setTimers(JSON.parse(savedTimers));
      const savedEnergy = await AsyncStorage.getItem("ENERGY_USAGE");
      if (savedEnergy) setEnergyData(JSON.parse(savedEnergy));
      const areasRaw = await AsyncStorage.getItem("AREA_DEVICES");
      const statesRaw = await AsyncStorage.getItem("DEVICE_STATES");
      const devsRaw = await AsyncStorage.getItem("DEVICES");
      setAreaDevices(areasRaw ? JSON.parse(areasRaw) : {});
      setDeviceStates(statesRaw ? JSON.parse(statesRaw) : {});
      setAllDevices(devsRaw ? JSON.parse(devsRaw) : []);
    } catch (e) { console.warn(e); } finally { setLoading(false); }
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
          if (success) {
              updateUsageLogs(deviceId, newState);
          } else {
              setDeviceStates(prevStates => {
                  const next = { ...prevStates, [deviceId]: currentState };
                  AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(next));
                  return next;
              });
          }
      }
  };

  const openTimerModal = () => {
      if (!selectedDeviceForOptions) return;
      setOptionsModalVisible(false);
      setSelectedDeviceForTimer(selectedDeviceForOptions);
      setTimerDuration(30);
      setTimerModalVisible(true);
  };

  const adjustTimerDuration = (amount) => {
    setTimerDuration(prev => {
      const newVal = prev + amount;
      return newVal < 1 ? 1 : newVal;
    });
  };

  const getTargetTimeDisplay = () => {
    const target = Date.now() + (timerDuration * 60 * 1000);
    return new Date(target).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const setDeviceTimer = async (type) => {
      if (!selectedDeviceForTimer) return;
      const duration = timerDuration;
      const deviceId = selectedDeviceForTimer.id || selectedDeviceForTimer.name;
      const command = (type === 'OFF' || type === 'RUN_STOP') ? 'off' : 'on';
      if (WidgetModule && WidgetModule.scheduleDeviceTimer) {
          if (type === 'RUN_STOP') await toggleDevice(selectedDeviceForTimer, true);
          WidgetModule.scheduleDeviceTimer(deviceId, command, duration);
          Alert.alert("Native Timer Set", `Device will turn ${command} in ${duration} mins`);
      } else {
          const targetTime = Date.now() + (duration * 60 * 1000);
          const timerObj = { time: targetTime, type: type === 'RUN_STOP' ? 'OFF' : type };
          if (type === 'RUN_STOP') await toggleDevice(selectedDeviceForTimer, true);
          const newTimers = { ...timers, [deviceId]: timerObj };
          setTimers(newTimers);
          await AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
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

  const toggleTheme = async () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem("THEME_MODE", newMode ? "dark" : "light");
  };

  const toggleDevice = async (device, forceOn = false) => {
    Vibration.vibrate(50);
    const key = device.id || device.name;
    const currentState = !!deviceStates[key];
    const newState = forceOn ? true : !currentState;
    setDeviceStates(prev => ({...prev, [key]: newState}));
    const success = await toggleDeviceLogic(device, newState ? "on" : "off");
    if (success) {
        const updatedStates = { ...deviceStates, [key]: newState };
        await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(updatedStates));
        updateUsageLogs(key, newState);
        if (WidgetModule) WidgetModule.updateWidget(device.name, newState ? "ON" : "OFF");
        if (!newState && !forceOn) {
            const newTimers = {...timers};
            if (newTimers[key]) {
                delete newTimers[key];
                setTimers(newTimers);
                await AsyncStorage.setItem("DEVICE_TIMERS", JSON.stringify(newTimers));
            }
        }
    } else {
        setDeviceStates(prev => ({...prev, [key]: currentState}));
        Alert.alert("Failed", "Device unavailable. Reverting.");
    }
  };

  const toggleFavorite = async (deviceId) => {
      let newFavs;
      if (favorites.includes(deviceId)) newFavs = favorites.filter(id => id !== deviceId);
      else newFavs = [...favorites, deviceId];
      setFavorites(newFavs);
      await AsyncStorage.setItem("FAVORITES", JSON.stringify(newFavs));
  };

  const syncToWidget = async () => {
    setOptionsModalVisible(false);
    setWidgetLayoutModalVisible(true);
  };

  const finalizeWidgetSync = async (layoutName) => {
    const activeId = currentConfigWidgetId || 1;
    const device = selectedDeviceForOptions;
    if (!device) return;
    const status = !!deviceStates[device.id || device.name] ? "ON" : "OFF";
    if (WidgetModule) {
      WidgetModule.syncSpecificWidget(activeId, device.name, status, layoutName, device.id || "");
      if (currentConfigWidgetId) WidgetModule.finishWidgetSetup(activeId);
      Alert.alert("Added", `${device.name} added to Home Screen!`);
    }
    setWidgetLayoutModalVisible(false);
  };

  const handleSettingsFooterTap = () => {
      const now = Date.now();
      const { lastTime, count } = settingsTapRef.current;
      if (now - lastTime < 400) settingsTapRef.current.count = count + 1;
      else settingsTapRef.current.count = 1;
      settingsTapRef.current.lastTime = now;
      if (settingsTapRef.current.count >= 3) {
          settingsTapRef.current.count = 0;
          setAdminModalVisible(true);
      } else {
          setActiveTab("settings");
      }
  };

  const checkLockState = async () => {
    try {
      const savedUnlockTime = await AsyncStorage.getItem("lock_until_time");
      const savedAttempts = await AsyncStorage.getItem("failed_attempts");
      if (savedAttempts) setAttempts(parseInt(savedAttempts) || 0);
      if (savedUnlockTime) {
        const unlockTime = parseInt(savedUnlockTime);
        if (Date.now() < unlockTime) {
          setIsLocked(true);
          startTimer(unlockTime);
        } else resetLockState(false);
      } else resetLockState(false);
    } catch (e) {}
  };

  const startTimer = (unlockTime) => {
    if (timerRef.current) clearInterval(timerRef.current);
    updateTimerText(unlockTime);
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (now >= unlockTime) {
        clearInterval(timerRef.current);
        resetLockState(false);
      } else updateTimerText(unlockTime);
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

  const verifyAdminPin = async () => {
    if (isLocked) return;
    if (adminPinInput.length !== 4) { Alert.alert("Error", "PIN must be 4 digits"); return; }
    try {
        const storedPin = await AsyncStorage.getItem("home_pin");
        if (storedPin && adminPinInput === storedPin) {
            await resetLockState(true);
            setAdminModalVisible(false);
            setAdminPinInput("");
            navigation.navigate("AdminScreen");
        } else {
            setAdminPinInput("");
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            await AsyncStorage.setItem("failed_attempts", newAttempts.toString());
            if (newAttempts >= MAX_ATTEMPTS) triggerLockout();
            else Alert.alert("Wrong PIN", `Attempts left: ${MAX_ATTEMPTS - newAttempts}`);
        }
    } catch (e) { Alert.alert("Error", "Something went wrong"); }
  };

  const generateBackupData = async () => {
      return JSON.stringify({
          home_name: await AsyncStorage.getItem("home_name"),
          AREA_DEVICES: await AsyncStorage.getItem("AREA_DEVICES"),
          DEVICES: await AsyncStorage.getItem("DEVICES"),
          DEVICE_STATES: await AsyncStorage.getItem("DEVICE_STATES"),
          DEVICE_TIMERS: await AsyncStorage.getItem("DEVICE_TIMERS"),
          WEATHER_CONFIG: await AsyncStorage.getItem("WEATHER_CONFIG"),
      });
  };

  const handleShareBackup = async () => {
      setBackupLoading(true);
      try {
          const data = await generateBackupData();
          await Share.share({ message: data, title: "DomoVate Backup" });
      } catch(e) { Alert.alert("Error", "Share failed"); }
      setBackupLoading(false);
  };

  const handleSaveBackup = async () => {
      setBackupLoading(true);
      try {
          const data = await generateBackupData();
          const path = RNFS.DownloadDirectoryPath + `/domovate_backup_${Date.now()}.json`;
          await RNFS.writeFile(path, data, 'utf8');
          Alert.alert("Saved", `Backup saved to Downloads folder!\n\nFile: ${path}`);
      } catch(e) { Alert.alert("Error", "Save failed."); }
      setBackupLoading(false);
  };

  const getDeviceIconInfo = (name, type) => {
    const n = (name || "").toLowerCase();
    const ty = (type || "").toLowerCase();
    if (n.includes("fan") || ty.includes("fan")) return { icon: "aperture-outline", color: "#00E1FF" };
    if (n.includes("ac") || ty.includes("ac")) return { icon: "snow-outline", color: "#80DEEA" };
    if (n.includes("tv") || ty.includes("tv")) return { icon: "tv-outline", color: "#FFB74D" };
    if (n.includes("bulb") || n.includes("light")) return { icon: "bulb-outline", color: "#FFD700" };
    return { icon: "power-outline", color: "#9BB1FF" };
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem("LANGUAGE", lang);
  };

  const handleDeviceLongPress = (device) => {
      setSelectedDeviceForOptions(device);
      if (currentConfigWidgetId) {
          setWidgetLayoutModalVisible(true);
      } else {
          setOptionsModalVisible(true);
      }
  };

  const handleOptionFavorite = async () => {
      if (!selectedDeviceForOptions) return;
      const key = selectedDeviceForOptions.id || selectedDeviceForOptions.name;
      await toggleFavorite(key);
      setOptionsModalVisible(false);
  };

  const renderDeviceItem = (deviceName, index) => {
      let device = allDevices.find(d => d.name === deviceName);
      if (!device) device = (typeof deviceName === 'object') ? deviceName : { name: deviceName, type: 'Device', id: deviceName };
      const key = device.id || device.name || index.toString();
      const isOn = !!deviceStates[key];
      const { icon } = getDeviceIconInfo(device.name, device.type);
      const isFav = favorites.includes(key);
      const remaining = getRemainingTime(key);
      return (
        <TouchableOpacity 
            key={key} 
            style={[
              styles.deviceCard, 
              { 
                backgroundColor: isOn ? "rgba(255, 215, 0, 0.2)" : colors.cardBg, 
                borderColor: isOn ? "#FFD700" : colors.cardBorder, 
                borderWidth: 1, 
                width: '48%' 
              },
              colors.shadow
            ]}
            onPress={() => toggleDevice(device)}
            onLongPress={() => handleDeviceLongPress(device)}
            delayLongPress={400}
        >
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 10}}>
              <View style={[styles.iconBox, { backgroundColor: isOn ? "rgba(255, 215, 0, 0.25)" : (isDarkMode ? "rgba(255,255,255,0.1)" : "#f0f0f0") }]}>
                  <Ionicons name={icon} size={24} color={isOn ? "#FFD700" : colors.iconDefault} />
              </View>
              <Switch 
                  value={isOn} 
                  onValueChange={() => toggleDevice(device)} 
                  trackColor={{ false: "#767577", true: "#FFD700" }}
                  thumbColor={isOn ? "#f4f3f4" : "#f4f3f4"}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
          </View>
          <View>
              <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'space-between'}}>
                  <Text style={[styles.deviceName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{device.name}</Text>
                  {isFav && <Ionicons name="heart" size={14} color={colors.danger} style={{marginLeft:4}} />}
              </View>
              {remaining ? (
                  <Text style={{color: colors.danger, fontSize: 11, fontWeight: 'bold', marginTop: 4}}>Act in: {remaining}</Text>
              ) : (
                  <Text style={[styles.deviceType, { color: colors.subText }]}>{device.type}</Text>
              )}
          </View>
        </TouchableOpacity>
      );
  };

  const renderVoiceModal = () => (
    <Modal visible={isListening || isProcessing} transparent animationType="slide">
      <View style={styles.voiceOverlay}>
        <SafeAreaView style={styles.voiceContent}>
        </SafeAreaView>
      </View>
    </Modal>
  ); 

  const renderContent = () => {
      if (activeTab === "settings") {
          return (
            <ScrollView contentContainerStyle={{padding: 20}}>
                <Text style={[styles.menuTitle, {color: colors.text}]}>{t.settings}</Text>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => changeLanguage(language === "EN" ? "HIN" : "EN")}>
                    <View style={[styles.menuIconBox, { backgroundColor: isDarkMode ? "#333" : "#eee" }]}>
                        <Ionicons name="globe-outline" size={22} color={colors.text} />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.language}: {language === "EN" ? "English" : "हिन्दी"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => setBackupModalVisible(true)}>
                    <View style={[styles.menuIconBox, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}>
                        <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.backup}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => navigation.navigate("WeatherScreen")}>
                    <View style={[styles.menuIconBox, { backgroundColor: "rgba(255, 140, 0, 0.1)" }]}>
                        <Ionicons name="partly-sunny-outline" size={22} color="#FF8C00" />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.weatherSet}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => navigation.navigate("PrivacyScreen")}>
                    <View style={[styles.menuIconBox, { backgroundColor: "rgba(237, 73, 86, 0.1)" }]}>
                        <Ionicons name="lock-closed-outline" size={22} color={colors.danger} />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.privacy}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => navigation.navigate("HelpScreen")}>
                    <View style={[styles.menuIconBox, { backgroundColor: "rgba(100, 255, 218, 0.1)" }]}>
                        <Ionicons name="help-buoy-outline" size={22} color="#64FFDA" />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.help}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, {borderColor: colors.cardBorder}]} onPress={() => navigation.navigate("AboutScreen")}>
                    <View style={[styles.menuIconBox, { backgroundColor: isDarkMode ? "#333" : "#eee" }]}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.iconDefault} />
                    </View>
                    <Text style={[styles.menuItemText, {color: colors.text}]}>{t.about}</Text>
                </TouchableOpacity>
            </ScrollView>
          );
      }
      if (activeTab === "favorites") {
          const favDevices = allDevices.filter(d => favorites.includes(d.id || d.name));
          return (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                    {favDevices.length > 0 ? (
                        favDevices.map((item, index) => renderDeviceItem(item.name, index))
                    ) : (
                        <View style={[styles.emptyContainer, {width: '100%'}]}>
                            <Ionicons name="heart-dislike-outline" size={60} color={colors.subText} />
                            <Text style={[styles.emptyText, {color: colors.subText}]}>{t.noFavorites}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
          );
      }
      return (
        <TouchableWithoutFeedback onPress={isListening ? stopListening : null}>
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
            <View style={[styles.welcomeSection, { alignItems: 'center' }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name={greeting.icon} size={20} color={greeting.color} style={{marginRight: 8}} />
                    <Text style={[styles.greetingText, {color: colors.text}]}>{greeting.text}</Text>
                </View>
            </View>
            {weatherConfig && weatherData && (
                 <View style={[styles.weatherCardBig, {backgroundColor: isDarkMode ? "#1E293B" : "#D0E8FF", borderColor: colors.cardBorder}]}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <View>
                        <Text style={[styles.weatherCity, {color: colors.text}]}>{weatherConfig.name}</Text>
                        <Text style={[styles.weatherRegion, {color: colors.subText}]}>{weatherConfig.admin1}, {weatherConfig.country}</Text>
                    </View>
                    <View style={[styles.aqiBadge, {backgroundColor: getAqiColor(weatherData.aqi)}]}>
                        <Text style={{fontSize: 10, fontWeight: 'bold', color: '#000'}}>AQI {weatherData.aqi !== null ? weatherData.aqi : "--"}</Text>
                    </View>
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.weatherTemp, {color: colors.text}]}>{weatherData.temp}°</Text>
                        <View style={{marginLeft: 10}}>
                            <Text style={{color: colors.text, fontWeight: '600'}}>{getWeatherIcon(weatherData.code).label}</Text>
                            <Text style={{color: colors.subText, fontSize: 12}}>H: {weatherData.humid}%</Text>
                        </View>
                    </View>
                    <Ionicons name={getWeatherIcon(weatherData.code).name} size={45} color={getWeatherIcon(weatherData.code).color} />
                    </View>
                </View>
            )}
            {Object.keys(areaDevices).length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={60} color={colors.subText} />
                    <Text style={[styles.emptyText, {color: colors.subText}]}>{t.noDevices}</Text>
                    <Text style={styles.emptySubText}>{t.goAdmin}</Text>
                </View>
            ) : (
                Object.keys(areaDevices).map((areaName) => (
                    <View key={areaName} style={styles.areaBlock}>
                        <Text style={[styles.areaTitle, {color: colors.accent}]}>{areaName}</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                             {(areaDevices[areaName] || []).map((deviceName, index) => renderDeviceItem(deviceName, index))}
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
        </TouchableWithoutFeedback>
      );
  };

  if (loading) return <View style={[styles.loadingWrap, {backgroundColor: colors.bg}]}><ActivityIndicator size="large" color={colors.accent} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.cardBorder }]}>
        {isListening ? (
             <View style={styles.voiceHeaderContainer}>
                <Animated.View style={[styles.headerPulse, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="mic" size={24} color="#060606" />
                </Animated.View>
                <Text style={[styles.headerVoiceText, {color: colors.text}]} numberOfLines={1}>
                    {lastSpoken || (isProcessing ? t.processing : t.listening)}
                </Text>
                <TouchableOpacity onPress={stopListening} style={styles.cancelMicBtn}>
                    <Ionicons name="close-circle" size={24} color={colors.danger} />
                </TouchableOpacity>
             </View>
        ) : (
            <>
                <View style={styles.headerLeft}>
                    <View style={{ marginRight: 8 }}>
                        <Ionicons name="home" size={24} color="#FFD700" />
                    </View>
                    <Text style={[styles.brandInsta, { color: "#FFD700" }]}>{homeName}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={startListening} style={[styles.iconBtn, {marginRight: 10}]}>
                            <Ionicons name="mic" size={26} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                        <Ionicons name={isDarkMode ? "sunny-outline" : "moon-outline"} size={26} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </>
        )}
      </View>
      <View style={{flex: 1, backgroundColor: colors.contentBg}}>
          {renderContent()}
      </View>
      <View style={[styles.footer, { backgroundColor: colors.footerBg, borderTopColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate("EnergyScreen")}>
              <Ionicons name="flash-outline" size={28} color={colors.text} />
              <Text style={[styles.footerText, {color: colors.text}]}>{t.energy}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => setActiveTab("favorites")}>
              <Ionicons name={activeTab === "favorites" ? "heart" : "heart-outline"} size={28} color={activeTab === "favorites" ? colors.accent : colors.text} />
              <Text style={[styles.footerText, {color: activeTab === "favorites" ? colors.accent : colors.text}]}>{t.fav}</Text>
          </TouchableOpacity>
          <View style={{ width: 70 }} />
          <View style={styles.centerBtnWrap}>
            <TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.accent }]} onPress={() => setActiveTab("home")}>
               <Ionicons name={activeTab === "home" ? "home" : "home-outline"} size={28} color={isDarkMode ? "#000" : "#fff"} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate("MasterControl")}>
              <Ionicons name="search-outline" size={28} color={colors.text} />
              <Text style={[styles.footerText, {color: colors.text}]}>{t.control}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={handleSettingsFooterTap}>
              <Ionicons name={activeTab === "settings" ? "settings" : "settings-outline"} size={28} color={activeTab === "settings" ? colors.accent : colors.text} />
              <Text style={[styles.footerText, {color: activeTab === "settings" ? colors.accent : colors.text}]}>{t.setBtn}</Text>
          </TouchableOpacity>
      </View>
      {renderVoiceModal()}
      <Modal visible={optionsModalVisible} transparent animationType="fade" onRequestClose={() => setOptionsModalVisible(false)}>
          <View style={styles.adminModalWrap}>
              <View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
                  <Text style={[styles.adminTitle, {color: colors.text}]}>{selectedDeviceForOptions?.name || t.options}</Text>
                  <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0, paddingVertical: 15}]} onPress={handleOptionFavorite}>
                      <View style={[styles.menuIconBox, { backgroundColor: "rgba(237, 73, 86, 0.1)" }]}>
                        <Ionicons name={favorites.includes(selectedDeviceForOptions?.id || selectedDeviceForOptions?.name) ? "heart" : "heart-outline"} size={22} color={colors.danger} />
                      </View>
                      <Text style={[styles.menuItemText, {color: colors.text}]}>
                          {favorites.includes(selectedDeviceForOptions?.id || selectedDeviceForOptions?.name) ? t.remFav : t.addFav}
                      </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0, paddingVertical: 15}]} onPress={syncToWidget}>
                      <View style={[styles.menuIconBox, { backgroundColor: "rgba(0, 225, 255, 0.1)" }]}>
                        <Ionicons name="apps-outline" size={22} color="#00E1FF" />
                      </View>
                      <Text style={[styles.menuItemText, {color: colors.text}]}>{t.syncWidget}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0, paddingVertical: 15}]} onPress={openTimerModal}>
                      <View style={[styles.menuIconBox, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}>
                          <Ionicons name="time-outline" size={22} color={colors.accent} />
                      </View>
                      <Text style={[styles.menuItemText, {color: colors.text}]}>{t.timerTitle}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {marginTop: 15, backgroundColor: '#444', width: '100%'}]} onPress={()=>setOptionsModalVisible(false)}>
                      <Text style={styles.modalBtnText}>{t.cancel}</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
      <Modal visible={adminModalVisible} transparent animationType="slide" onRequestClose={() => setAdminModalVisible(false)}>
        <View style={styles.adminModalWrap}>
            <View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
                <Text style={[styles.adminTitle, {color: colors.text}]}>{isLocked ? t.appLocked : t.adminMode}</Text>
                {isLocked ? (
                    <View style={{alignItems: 'center', marginVertical: 10}}>
                      <Ionicons name="lock-closed" size={40} color={colors.danger} style={{marginBottom:10}} />
                      <Text style={{color: colors.danger, fontSize: 16, marginBottom: 5}}>{t.tryAgain}</Text>
                      <Text style={{color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 20}}>{timeLeft}</Text>
                      <TouchableOpacity onPress={() => { setAdminModalVisible(false); navigation.navigate("ForgotPin"); }}>
                        <Text style={{color: colors.danger, textDecorationLine:'underline', fontSize: 16}}>{t.forgotPin}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#2E3A66', marginTop: 20, width: '100%'}]} onPress={()=>setAdminModalVisible(false)}>
                        <Text style={styles.modalBtnText}>{t.close}</Text>
                      </TouchableOpacity>
                    </View>
                ) : (
                    <>
                    <TextInput 
                        placeholder={t.enterPin} placeholderTextColor="#556" secureTextEntry style={[styles.adminInput, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.cardBorder}]} 
                        value={adminPinInput} onChangeText={setAdminPinInput} keyboardType="numeric" maxLength={4} autoFocus 
                    />
                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#2E3A66'}]} onPress={()=>setAdminModalVisible(false)}>
                            <Text style={styles.modalBtnText}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtn, {backgroundColor: colors.accent}]} onPress={verifyAdminPin}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>{t.verify}</Text>
                        </TouchableOpacity>
                    </View>
                    </>
                )}
            </View>
        </View>
      </Modal>
      <Modal visible={timerModalVisible} transparent animationType="fade" onRequestClose={() => setTimerModalVisible(false)}>
          <View style={styles.adminModalWrap}>
              <View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
                  <View style={styles.timerHeader}>
                      <Ionicons name="timer-outline" size={24} color={colors.accent} />
                      <Text style={[styles.adminTitle, {color: colors.text, marginBottom: 0, marginLeft: 10}]}>{t.timerTitle}</Text>
                  </View>
                  <Text style={[styles.targetTimeText, {color: colors.subText}]}>{t.willTurnOffAt} <Text style={{color: colors.accent, fontWeight: 'bold'}}>{getTargetTimeDisplay()}</Text></Text>
                  <ScrollView style={{maxHeight: 250}}>
                    <View style={styles.timerPickerContainer}>
                        <TouchableOpacity style={[styles.adjustBtn, {borderColor: colors.cardBorder}]} onPress={() => adjustTimerDuration(-5)}>
                            <Ionicons name="remove" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.timerDisplay}>
                            <Text style={[styles.timerValue, {color: colors.text}]}>{timerDuration}</Text>
                            <Text style={[styles.timerUnit, {color: colors.subText}]}>min</Text>
                        </View>
                        <TouchableOpacity style={[styles.adjustBtn, {borderColor: colors.cardBorder}]} onPress={() => adjustTimerDuration(5)}>
                            <Ionicons name="add" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.presetContainer}>
                        {[10, 30, 60, 120].map(m => (
                            <TouchableOpacity 
                              key={m} 
                              style={[styles.presetChip, {backgroundColor: timerDuration === m ? colors.accent : colors.inputBg}]} 
                              onPress={() => setTimerDuration(m)}
                            >
                              <Text style={{color: timerDuration === m ? "#FFF" : colors.text, fontWeight: '600'}}>{m}m</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.modalBtn, {marginTop: 20, backgroundColor: colors.accent, width: '100%', height: 60}]} onPress={() => setDeviceTimer('TOGGLE')}>
                        <Text style={styles.modalBtnText}>{t.flipState}</Text>
                        <Text style={{color: '#000', fontSize: 10, marginTop: 2, fontWeight: '600'}}>ON ➔ OFF / OFF ➔ ON</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: '#2E3A66', width: '100%', height: 60}]} onPress={() => setDeviceTimer('RUN_STOP')}>
                        <Text style={styles.modalBtnText}>{t.runAndStop}</Text>
                        <Text style={{color: '#FFF', fontSize: 10, marginTop: 2, fontWeight: '600'}}>Turn ON Now ➔ Turn OFF Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: '#10B981', width: '100%', height: 60}]} onPress={() => setDeviceTimer('OFF')}>
                        <Text style={styles.modalBtnText}>Force Turn OFF</Text>
                        <Text style={{color: '#FFF', fontSize: 10, marginTop: 2, fontWeight: '600'}}>Ensure device turns OFF at target time</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: colors.danger, width: '100%', height: 50}]} onPress={clearDeviceTimer}>
                        <Text style={styles.modalBtnText}>{t.cancelTimer}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                  <TouchableOpacity style={[styles.modalBtn, {marginTop: 10, backgroundColor: colors.inputBg, width: '100%'}]} onPress={()=>setTimerModalVisible(false)}>
                      <Text style={[styles.modalBtnText, {color: colors.text}]}>{t.cancel}</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
      <Modal visible={backupModalVisible} transparent animationType="slide" onRequestClose={() => setBackupModalVisible(false)}>
          <View style={styles.adminModalWrap}>
              <View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
                  <Text style={[styles.adminTitle, {color: colors.text}]}>{t.backupTitle}</Text>
                  {backupLoading ? (
                      <ActivityIndicator size="large" color={colors.accent} style={{marginVertical: 20}} />
                  ) : (
                      <View>
                          <TouchableOpacity style={[styles.backupBtn, {backgroundColor: colors.accent}]} onPress={handleShareBackup}>
                              <Ionicons name="share-social" size={20} color="#fff" style={{marginRight: 10}} />
                              <Text style={{color: '#fff', fontWeight: 'bold'}}>{t.shareBackup}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.backupBtn, {backgroundColor: '#2E3A66', marginTop: 15}]} onPress={handleSaveBackup}>
                              <Ionicons name="download" size={20} color="#fff" style={{marginRight: 10}} />
                              <Text style={{color: '#fff', fontWeight: 'bold'}}>{t.saveBackup}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.modalBtn, {marginTop: 20, backgroundColor: '#444', width: '100%'}]} onPress={()=>setBackupModalVisible(false)}>
                              <Text style={styles.modalBtnText}>{t.close}</Text>
                          </TouchableOpacity>
                      </View>
                  )}
              </View>
          </View>
      </Modal>
      <Modal visible={widgetLayoutModalVisible} transparent animationType="slide">
          <View style={styles.adminModalWrap}>
              <View style={[styles.adminModal, {backgroundColor: colors.modalBg}]}>
                  <Text style={[styles.adminTitle, {color: colors.text}]}>{t.selectLayout}</Text>
                  <TouchableOpacity style={styles.layoutOption} onPress={() => finalizeWidgetSync("home_widget_layout")}>
                      <Ionicons name="square-outline" size={24} color={colors.accent} />
                      <Text style={{color: colors.text, marginLeft: 10}}>Full Control (Name + Status + Button)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.layoutOption} onPress={() => finalizeWidgetSync("widget_mini_toggle")}>
                      <Ionicons name="radio-button-on-outline" size={24} color={colors.accent} />
                      <Text style={{color: colors.text, marginLeft: 10}}>Mini Design (Icon Only)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.layoutOption} onPress={() => finalizeWidgetSync("widget_slim_bar")}>
                      <Ionicons name="remove-outline" size={24} color={colors.accent} />
                      <Text style={{color: colors.text, marginLeft: 10}}>Slim Bar (Horizontal Bar)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, {width: '100%', marginTop: 10}]} onPress={() => setWidgetLayoutModalVisible(false)}>
                      <Text style={styles.modalBtnText}>{t.cancel}</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { height: 60, flexDirection: 'row', justifyContent: "space-between", alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  brandInsta: { fontSize: 24, fontWeight: "bold", fontFamily: Platform.OS === 'ios' ? 'Georgia-BoldItalic' : 'serif', fontStyle: 'italic' },
  iconBtn: { padding: 8 },
  voiceHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerPulse: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerVoiceText: { fontSize: 16, fontWeight: '600', maxWidth: '60%' },
  cancelMicBtn: { marginLeft: 10, padding: 5 },
  welcomeSection: { marginTop: 15, marginBottom: 15 },
  greetingText: { fontSize: 16, fontWeight: "600" },
  weatherCardBig: { width: '100%', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1 },
  weatherCity: { fontSize: 22, fontWeight: 'bold' },
  weatherRegion: { fontSize: 14, opacity: 0.8 },
  weatherTemp: { fontSize: 48, fontWeight: 'bold' },
  aqiBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  areaBlock: { marginBottom: 25 },
  areaTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  deviceCard: { padding: 15, borderRadius: 14, marginBottom: 12, flexDirection: 'column', height: 130, justifyContent: 'space-between' },
  iconBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 15, fontWeight: "600" },
  deviceType: { fontSize: 12 },
  menuTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  menuIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { fontSize: 16, flex: 1 },
  adminModalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  adminModal: { width: "85%", padding: 20, borderRadius: 14, maxHeight: '80%' },
  adminTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  adminInput: { padding: 12, borderRadius: 8, borderWidth: 1, textAlign: "center", fontSize: 16, marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", justifyContent: "space-between" },
  modalBtn: { paddingVertical: 12, borderRadius: 8, flex: 0.48, alignItems: "center", justifyContent: 'center' },
  modalBtnText: { color: "#fff", fontWeight: "600" },
  backupBtn: { padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  timerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  targetTimeText: { textAlign: 'center', marginBottom: 20, fontSize: 14 },
  timerPickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  adjustBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  timerDisplay: { width: 100, alignItems: 'center' },
  timerValue: { fontSize: 36, fontWeight: 'bold' },
  timerUnit: { fontSize: 14 },
  presetContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  presetChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10 },
  emptySubText: { color: "#888", fontSize: 12, marginTop: 5 },
  footer: { position: 'absolute', bottom: 0, width: width, height: 70, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingBottom: 5, justifyContent: 'space-around' },
  footerBtn: { alignItems: 'center', justifyContent: 'center', width: 60, height: '100%' },
  footerText: { fontSize: 10, marginTop: 2, fontWeight: '600' },
  centerBtnWrap: { position: 'absolute', bottom: 25, left: (width / 2) - 32, width: 64, height: 64, zIndex: 10 },
  centerBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  layoutOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' }
});