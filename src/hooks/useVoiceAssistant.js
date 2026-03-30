import { useState, useEffect, useRef } from 'react';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { Vibration, PermissionsAndroid, Platform, NativeModules } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

const { WidgetModule } = NativeModules;
const GEMINI_API_KEY = "AIzaSyBwk1CNdsWxrL5c1rOnrGwNH5EDPyOU5TE"; 

export const useVoiceAssistant = (allDevices, toggleDeviceLogic, currentLanguage, weatherData, energyData) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSpoken, setLastSpoken] = useState("");
    const [assistantReply, setAssistantReply] = useState("");
    const isGreetingRef = useRef(false);

    const LANG_CODE = currentLanguage === "HIN" ? 'hi-IN' : 'en-IN';

    useEffect(() => {
        const initVoiceModules = async () => {
            if (Platform.OS === 'android') {
                await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            }
            try {
                await Tts.getInitStatus();
                const voices = await Tts.voices();
                const bestVoice = voices.find(v => 
                    v.language === LANG_CODE && 
                    (v.id.includes("hi-in-x-hie-local") || v.id.includes("hi-in-x-cfn-local"))
                ) || voices.find(v => v.language === LANG_CODE);

                if (bestVoice) await Tts.setDefaultVoice(bestVoice.id);
                await Tts.setDefaultRate(0.55);
                await Tts.setDefaultPitch(1.0);
                await Tts.setIgnoreSilentSwitch("ignore");
            } catch (err) {
                console.log("TTS Init Error:", err);
            }
        };
        initVoiceModules();

        Voice.onSpeechStart = () => setIsListening(true);
        Voice.onSpeechEnd = () => setIsListening(false);
        Voice.onSpeechPartialResults = (e) => {
            if (e.value && e.value[0]) setLastSpoken(e.value[0]);
        };
        Voice.onSpeechResults = onSpeechResults;
        Voice.onSpeechError = (e) => {
            stopListening();
        };

        const onTtsFinish = () => {
            if (isGreetingRef.current) {
                isGreetingRef.current = false;
                startMicNow();
            }
        };

        const ttsListener = Tts.addEventListener('tts-finish', onTtsFinish);
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
            ttsListener.remove();
        };
    }, [currentLanguage]);

    const stopListening = async () => {
        try {
            await Voice.stop();
            setIsListening(false);
            setIsProcessing(false);
        } catch (e) {}
    };

    const startMicNow = async () => {
        try {
            setLastSpoken("");
            setAssistantReply("");
            const lang = currentLanguage === "HIN" ? 'hi-IN' : 'en-IN';
            await Voice.start(lang);
        } catch (e) {
            try { await Voice.start('en-US'); } catch(err) { setIsListening(false); }
        }
    };

    const speak = async (text, isGreeting = false) => {
        try {
            isGreetingRef.current = isGreeting;
            await Tts.stop();
            Tts.speak(text, {
                androidParams: {
                    KEY_PARAM_PAN: -1,
                    KEY_PARAM_VOLUME: 1,
                    KEY_PARAM_STREAM: 'STREAM_MUSIC',
                },
            });
            if (isGreeting) setIsListening(true); 
        } catch(e) {}
    };

    const startListening = async () => {
        const greet = currentLanguage === "HIN" ? "जी, आदेश दीजिये?" : "Yes, how can I help?";
        speak(greet, true);
    };

    const onSpeechResults = async (e) => {
        if (e.value && e.value[0]) {
            const cmd = e.value[0];
            setLastSpoken(cmd);
            setIsListening(false);
            processCommand(cmd);
        }
    };

    const processCommand = async (command) => {
        setIsProcessing(true);

        const deviceContext = allDevices.map(d => ({ 
            id: d.id || d.name, 
            name: d.name, 
            area: d.areaName || "Unknown" 
        }));
        
        const prompt = `System: DomoVate Home Assistant.
        Available Devices: ${JSON.stringify(deviceContext)}.
        User: "${command}".
        Current Weather: ${weatherData?.temp || 'unknown'}°C.
        Energy Usage: ${energyData?.total || 0}W.

        Rules:
        1. Identify device and action (on/off).
        2. Respond strictly in ${currentLanguage === "HIN" ? 'Hindi' : 'English'}.
        3. Return ONLY valid JSON without markdown formatting.

        Format:
        {
            "speak": "Response text",
            "targets": ["device_id_or_name"],
            "action": "on" | "off" | "none"
        }`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await response.json();
            let resText = data.candidates[0].content.parts[0].text;
            resText = resText.replace(/```json/g, "").replace(/```/g, "").trim();

            const result = JSON.parse(resText);
            
            if (result.targets && result.targets.length > 0 && result.action !== "none") {
                const cleanAction = result.action.toLowerCase(); 
                let totalSuccess = false;

                const statesRaw = await AsyncStorage.getItem("DEVICE_STATES");
                let currentStates = statesRaw ? JSON.parse(statesRaw) : {};

                for (const targetId of result.targets) {
                    const dev = allDevices.find(d => 
                        (d.id && d.id === targetId) || 
                        (d.name && d.name.toLowerCase().trim() === targetId.toLowerCase().trim())
                    );
                    
                    if (dev) {
                        const success = await toggleDeviceLogic(dev, cleanAction, true);
                        if (success) {
                            totalSuccess = true;
                            currentStates[dev.id || dev.name] = (cleanAction === 'on');
                            if (WidgetModule) WidgetModule.updateWidget(dev.name, cleanAction.toUpperCase());
                        }
                    }
                }

                if (totalSuccess) {
                    await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(currentStates));
                    const successMsg = currentLanguage === "HIN" 
                        ? `जी, मैंने डिवाइस को ${cleanAction === 'on' ? 'चालू' : 'बंद'} कर दिया है।` 
                        : `Ok, I have turned ${cleanAction} the device.`;
                    setAssistantReply(successMsg);
                    speak(successMsg);
                    Vibration.vibrate(100);
                } else {
                    const failMsg = currentLanguage === "HIN" ? "क्षमा करें, डिवाइस रिस्पॉन्ड नहीं कर रहा है।" : "Sorry, the device is not responding.";
                    setAssistantReply(failMsg);
                    speak(failMsg);
                }
            } else {
                setAssistantReply(result.speak);
                speak(result.speak);
            }
        } catch (e) {
            speak(currentLanguage === "HIN" ? "क्षमा करें, मैं समझ नहीं पाई।" : "Sorry, I couldn't do that.");
        } finally {
            setTimeout(() => setIsProcessing(false), 4000);
        }
    };

    return { isListening, isProcessing, lastSpoken, assistantReply, startListening, stopListening };
};