/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Book, 
  Heart, 
  Calendar, 
  Home, 
  User, 
  Mic, 
  Play, 
  Pause, 
  ChevronRight, 
  Search,
  MapPin,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Calculator,
  Hash,
  Compass,
  Clock,
  BookOpen,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { Surah, Ayah, PrayerTimes, Dua, Hadith, HadithEdition, AllahName } from './types';
import { DUAS, HADITHS, ISLAMIC_EVENTS, DAILY_SUNNAHS, ALLAH_NAMES } from './constants';
import { correctRecitation } from './services/geminiService';
import Markdown from 'react-markdown';
import confetti from 'canvas-confetti';

type Tab = 'home' | 'quran' | 'dua' | 'calendar' | 'profile' | 'wishlist' | 'canvas' | 'tools' | 'help';

const districts = [
  { name: 'ঢাকা', lat: 23.8103, lng: 90.4125 },
  { name: 'চট্টগ্রাম', lat: 22.3569, lng: 91.7832 },
  { name: 'সিলেট', lat: 24.8949, lng: 91.8687 },
  { name: 'রাজশাহী', lat: 24.3745, lng: 88.6042 },
  { name: 'খুলনা', lat: 22.8456, lng: 89.5403 },
  { name: 'বরিশাল', lat: 22.7010, lng: 90.3535 },
  { name: 'রংপুর', lat: 25.7439, lng: 89.2752 },
  { name: 'ময়মনসিংহ', lat: 24.7471, lng: 90.4203 },
  { name: 'নারায়ণগঞ্জ', lat: 23.6238, lng: 90.5000 },
  { name: 'গাজীপুর', lat: 23.9999, lng: 90.4203 },
  { name: 'কুমিল্লা', lat: 23.4607, lng: 91.1809 },
  { name: 'বরগুনা', lat: 22.1591, lng: 90.1262 },
  { name: 'ভোলা', lat: 22.6859, lng: 90.6440 },
  { name: 'পটুয়াখালী', lat: 22.3595, lng: 90.3297 },
  { name: 'ঝালকাঠি', lat: 22.6422, lng: 90.1989 },
  { name: 'পিরোজপুর', lat: 22.5791, lng: 89.9751 },
  { name: 'ব্রাহ্মণবাড়িয়া', lat: 23.9571, lng: 91.1119 },
  { name: 'চাঁদপুর', lat: 23.2321, lng: 90.6631 },
  { name: 'লক্ষ্মীপুর', lat: 22.9429, lng: 90.8417 },
  { name: 'নোয়াখালী', lat: 22.8696, lng: 91.0994 },
  { name: 'ফেনী', lat: 23.0159, lng: 91.3976 },
  { name: 'খাগড়াছড়ি', lat: 23.1192, lng: 91.9846 },
  { name: 'রাঙ্গামাটি', lat: 22.6574, lng: 92.1733 },
  { name: 'বান্দরবান', lat: 22.1953, lng: 92.2184 },
  { name: 'কক্সবাজার', lat: 21.4272, lng: 92.0058 },
];

const formatTime12h = (time24: string | undefined) => {
  if (!time24) return '--:--';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const getHijriDate = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-uma-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const d = parts.find(p => p.type === 'day')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const y = parts.find(p => p.type === 'year')?.value;

    // If the year is 2026 or similar, it means it fell back to Gregorian
    if (y && parseInt(y) > 1600) {
       throw new Error('Intl fallback');
    }

    const hijriMonths = [
      "মুহররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি", 
      "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান", 
      "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"
    ];

    return {
      day: parseInt(d!).toLocaleString('bn-BD'),
      month: hijriMonths[parseInt(m!) - 1],
      year: parseInt(y!).toLocaleString('bn-BD', { useGrouping: false })
    };
  } catch (e) {
    // Manual fallback for Feb 2026 (Ramadan 1447)
    // Feb 1, 2026 is Shaban 13, 1447
    const baseDate = new Date(2026, 1, 1);
    const diff = Math.round((date.getTime() - baseDate.getTime()) / 86400000);
    let hDay = 13 + diff;
    let hMonth = "শাবান";
    let hYear = 1447;

    if (hDay > 29) { 
       hDay -= 29;
       hMonth = "রমজান";
    }

    return {
      day: hDay.toLocaleString('bn-BD'),
      month: hMonth,
      year: hYear.toLocaleString('bn-BD', { useGrouping: false })
    };
  }
};

export default function App() {
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('userName') || '';
  });
  const [userDetails, setUserDetails] = useState<string>('');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('onboarded') === 'true';
  });
  const [showSplash, setShowSplash] = useState(!onboarded);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [duaTab, setDuaTab] = useState<'dua' | 'hadith'>('dua');
  const [toolTab, setToolTab] = useState<'tasbih' | 'zakat' | 'names'>('tasbih');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<string>('ঢাকা');
  const [coords, setCoords] = useState<{lat: number, lng: number}>({ lat: 23.8103, lng: 90.4125 });
  const [madhab, setMadhab] = useState<number>(1); // 0 for Shafi, 1 for Hanafi
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<string | null>(null);
  const [currentVerseForCorrection, setCurrentVerseForCorrection] = useState<Ayah | null>(null);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [showIftarModal, setShowIftarModal] = useState(false);
  const [showDailySunnahModal, setShowDailySunnahModal] = useState(false);
  const [zakatAmount, setZakatAmount] = useState<number | null>(null);
  const [tasbihCount, setTasbihCount] = useState(0);
  const [tasbihTarget, setTasbihTarget] = useState(33);
  const [showDistrictSelector, setShowDistrictSelector] = useState(false);
  const [lastReminderDate, setLastReminderDate] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [duaSearchQuery, setDuaSearchQuery] = useState('');
  const [selectedDuaCategory, setSelectedDuaCategory] = useState('সব');
  const [sehriAlarmOffset, setSehriAlarmOffset] = useState(10);
  const [iftarAlarmOffset, setIftarAlarmOffset] = useState(0);
  const [sehriAlarmEnabled, setSehriAlarmEnabled] = useState(true);
  const [iftarAlarmEnabled, setIftarAlarmEnabled] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDonatePopup, setShowDonatePopup] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempUserDetails, setTempUserDetails] = useState('');
  const [favoriteDuas, setFavoriteDuas] = useState<string[]>([]);
  const [favoriteSurahs, setFavoriteSurahs] = useState<number[]>([]);
  const [completedSurahs, setCompletedSurahs] = useState<number[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [playingFullSurah, setPlayingFullSurah] = useState<number | null>(null);
  const fullSurahAudioRef = useRef<HTMLAudioElement | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMessage, setReminderMessage] = useState('রাসূল (সা.)-এর সুন্নাহ ও আমল');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [hadithEditions, setHadithEditions] = useState<HadithEdition[]>([]);
  const [selectedHadithEdition, setSelectedHadithEdition] = useState<HadithEdition | null>(null);
  const [apiHadiths, setApiHadiths] = useState<Hadith[]>([]);
  const [hadithLoading, setHadithLoading] = useState(false);
  const [quranSearchQuery, setQuranSearchQuery] = useState('');
  const [hadithSearchQuery, setHadithSearchQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [lastReadSurah, setLastReadSurah] = useState<{number: number, name: string} | null>(null);

  // Load data from localStorage
  useEffect(() => {
    const storedFavDuas = localStorage.getItem('favoriteDuas');
    const storedFavSurahs = localStorage.getItem('favoriteSurahs');
    const storedCompletedSurahs = localStorage.getItem('completedSurahs');
    const storedLastRead = localStorage.getItem('lastReadSurah');
    
    if (storedFavDuas) setFavoriteDuas(JSON.parse(storedFavDuas));
    if (storedFavSurahs) setFavoriteSurahs(JSON.parse(storedFavSurahs));
    if (storedCompletedSurahs) setCompletedSurahs(JSON.parse(storedCompletedSurahs));
    if (storedLastRead) setLastReadSurah(JSON.parse(storedLastRead));
  }, []);

  useEffect(() => {
    localStorage.setItem('favoriteDuas', JSON.stringify(favoriteDuas));
  }, [favoriteDuas]);

  useEffect(() => {
    localStorage.setItem('favoriteSurahs', JSON.stringify(favoriteSurahs));
  }, [favoriteSurahs]);

  useEffect(() => {
    localStorage.setItem('completedSurahs', JSON.stringify(completedSurahs));
  }, [completedSurahs]);

  useEffect(() => {
    fetchSurahs();
    fetchHadithEditions();
    if (onboarded) {
      getUserLocation();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [onboarded]);

  useEffect(() => {
    fetchPrayerTimes();
  }, [madhab, coords]);

  const getNextPrayer = () => {
    if (!prayerTimes) return { name: '---', time: '--:--' };
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const prayers = [
      { name: 'ফজর', time: prayerTimes.Fajr },
      { name: 'যুহর', time: prayerTimes.Dhuhr },
      { name: 'আসর', time: prayerTimes.Asr },
      { name: 'মাগরিব', time: prayerTimes.Maghrib },
      { name: 'এশা', time: prayerTimes.Isha }
    ];

    for (const prayer of prayers) {
      const [h, m] = prayer.time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      if (prayerMinutes > currentTime) {
        return prayer;
      }
    }
    
    return prayers[0];
  };

  const playAlarmSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play blocked", e));
  };

  const speakMale = (text: string, lang: string = 'bn-BD') => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => 
      (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark')) && 
      v.lang.startsWith(lang.split('-')[0])
    );
    
    if (maleVoice) {
      msg.voice = maleVoice;
    } else {
      msg.pitch = 0.8;
    }
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  };

  const speakIftarMessage = () => {
    speakMale("ইফতারের সময় হয়েছে। বিসমিল্লাহ বলে ইফতার শুরু করুন। সুন্নাহ অনুযায়ী প্রথমে খেজুর বা পানি দিয়ে ইফতার করুন। ইফতারের পর এই দোয়াটি পড়ুন: জাহাবাজ জামাউ ওয়াবতাল্লাতিল উরুকু ওয়া সাবাতাল আজরু ইনশাআল্লাহ। অর্থ: পিপাসা মিটেছে, শিরাগুলো সিক্ত হয়েছে এবং ইনশাআল্লাহ পুরস্কার নির্ধারিত হয়েছে।");
  };

  const toggleFavoriteDua = (duaId: string) => {
    const isFav = favoriteDuas.includes(duaId);
    setFavoriteDuas(prev => 
      isFav ? prev.filter(id => id !== duaId) : [...prev, duaId]
    );
  };

  const toggleFavoriteSurah = (surahNumber: number) => {
    const isFav = favoriteSurahs.includes(surahNumber);
    setFavoriteSurahs(prev => 
      isFav ? prev.filter(n => n !== surahNumber) : [...prev, surahNumber]
    );
  };

  const toggleSurahCompletion = (surahNumber: number) => {
    const isCompleted = completedSurahs.includes(surahNumber);
    setCompletedSurahs(prev => 
      isCompleted ? prev.filter(n => n !== surahNumber) : [...prev, surahNumber]
    );
    
    if (!isCompleted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#34d399']
      });
    }
  };

  const playFullSurah = (surahNumber: number) => {
    if (playingFullSurah === surahNumber) {
      fullSurahAudioRef.current?.pause();
      setPlayingFullSurah(null);
      return;
    }
    
    if (fullSurahAudioRef.current) {
      fullSurahAudioRef.current.pause();
    }

    const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`;
    const audio = new Audio(audioUrl);
    fullSurahAudioRef.current = audio;
    setPlayingFullSurah(surahNumber);
    audio.play().catch(e => console.log("Audio play blocked", e));
    
    audio.onended = () => {
      setPlayingFullSurah(null);
      toggleSurahCompletion(surahNumber);
    };
  };

  const [countdownTarget, setCountdownTarget] = useState<string>('');

  // Countdown Logic for Sehri and Iftar
  useEffect(() => {
    const timer = setInterval(() => {
      if (!prayerTimes) return;
      const now = new Date();
      
      const [imsakH, imsakM] = prayerTimes.Imsak.split(':').map(Number);
      const [maghribH, maghribM] = prayerTimes.Maghrib.split(':').map(Number);
      
      const imsakTime = new Date();
      imsakTime.setHours(imsakH, imsakM, 0);
      
      const maghribTime = new Date();
      maghribTime.setHours(maghribH, maghribM, 0);

      let targetTime: Date;
      let label: string;

      if (now < imsakTime) {
        targetTime = imsakTime;
        label = 'সেহরির বাকি আছে';
      } else if (now < maghribTime) {
        targetTime = maghribTime;
        label = 'ইফতারের বাকি আছে';
      } else {
        // Next day's Imsak
        targetTime = new Date();
        targetTime.setDate(targetTime.getDate() + 1);
        targetTime.setHours(imsakH, imsakM, 0);
        label = 'সেহরির বাকি আছে';
      }

      setCountdownTarget(label);

      const diff = targetTime.getTime() - now.getTime();
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown('সময় হয়েছে');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [prayerTimes]);

  // Alarm Check Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (!prayerTimes || !notificationsEnabled) return;
      
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      
      const prayers = [
        { id: 'Fajr', name: 'ফজর' },
        { id: 'Dhuhr', name: 'যুহর' },
        { id: 'Asr', name: 'আসর' },
        { id: 'Maghrib', name: 'মাগরিব' },
        { id: 'Isha', name: 'এশা' }
      ];

      // Regular Prayer Alarms
      for (const prayer of prayers) {
        const [h, m] = (prayerTimes as any)[prayer.id].split(':').map(Number);
        const prayerTotalMinutes = h * 60 + m;
        
        if (currentTotalMinutes === prayerTotalMinutes) {
          playAlarmSound();
          if (prayer.id === 'Maghrib') {
            speakIftarMessage();
          }
          if (Notification.permission === "granted") {
            new Notification(`${prayer.name} নামাজের সময় হয়েছে`, {
              body: `আপনার বর্তমান অবস্থান: ${location}`,
              icon: '/favicon.ico'
            });
          }
        }
      }

      // Customizable Sehri Alarm
      const [imsakH, imsakM] = prayerTimes.Imsak.split(':').map(Number);
      const imsakTotalMinutes = imsakH * 60 + imsakM;
      
      if (sehriAlarmEnabled) {
        if (currentTotalMinutes === imsakTotalMinutes) {
          playAlarmSound();
          speakMale("সেহরির সময় শেষ হয়েছে। এখন থেকে রোজা শুরু।");
        } else if (currentTotalMinutes === imsakTotalMinutes - sehriAlarmOffset) {
          playAlarmSound();
          speakMale(`সেহরির সময় শেষ হতে ${sehriAlarmOffset} মিনিট বাকি। দয়া করে খাবার শেষ করুন।`);
        }
      }

      // Customizable Iftar Alarm
      const [maghribH, maghribM] = prayerTimes.Maghrib.split(':').map(Number);
      const maghribTotalMinutes = maghribH * 60 + maghribM;
      if (iftarAlarmEnabled && iftarAlarmOffset > 0 && currentTotalMinutes === maghribTotalMinutes - iftarAlarmOffset) {
        playAlarmSound();
        speakMale(`ইফতার শুরু হতে ${iftarAlarmOffset} মিনিট বাকি। ইফতারের প্রস্তুতি নিন এবং দোয়া করুন।`);
      }

      // Daily Sunnah Reminder
      const [remHour, remMin] = reminderTime.split(':').map(Number);
      const reminderTotalMinutes = remHour * 60 + remMin;
      const todayStr = now.toDateString();
      if (reminderEnabled && currentTotalMinutes === reminderTotalMinutes && lastReminderDate !== todayStr) {
        setLastReminderDate(todayStr);
        setShowDailySunnahModal(true);
        playAlarmSound();
        if (Notification.permission === "granted") {
          new Notification(reminderMessage, {
            body: "আজকের সুন্নাহ ও আমল দেখে নিন।",
            icon: '/favicon.ico'
          });
        }
        speakMale(reminderMessage + ". আজকের সুন্নাহ ও আমল দেখে নিন।");
      }

    }, 60000);

    return () => clearInterval(interval);
  }, [prayerTimes, notificationsEnabled, location, sehriAlarmOffset, iftarAlarmOffset]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playAlarmSound();
      speakMale("সময় শেষ হয়েছে।");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          setLocation(`আপনার অবস্থান`);
        },
        (error) => {
          console.log("Geolocation error or denied:", error.message);
          // Fallback is already set to Dhaka in state
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  };

  const fetchSurahs = async () => {
    try {
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await res.json();
      setSurahs(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHadithEditions = async () => {
    try {
      const response = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json');
      const data = await response.json();
      
      const editions: HadithEdition[] = Object.keys(data)
        .map(key => ({
          ...data[key],
          editionName: key
        }));
      
      setHadithEditions(editions);
    } catch (error) {
      console.error("Error fetching hadith editions:", error);
    }
  };

  const fetchHadithsByEdition = async (editionName: string) => {
    setHadithLoading(true);
    try {
      const response = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${editionName}.json`);
      const data = await response.json();
      
      const formattedHadiths: Hadith[] = data.hadiths.map((h: any) => ({
        hadithNumber: h.hadithnumber,
        arabicNumber: h.arabicnumber,
        text: h.text,
        reference: `${data.metadata.name}, হাদিস নং: ${h.hadithnumber}`,
        grades: h.grades
      }));
      setApiHadiths(formattedHadiths);
    } catch (error) {
      console.error("Error fetching hadiths:", error);
    } finally {
      setHadithLoading(false);
    }
  };

  const fetchSurahDetails = async (number: number) => {
    setLoading(true);
    try {
      const surah = surahs.find(s => s.number === number);
      if (surah) {
        const lastRead = { number: surah.number, name: surah.englishName };
        setLastReadSurah(lastRead);
        localStorage.setItem('lastReadSurah', JSON.stringify(lastRead));
      }
      const [arabicRes, bengaliRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${number}`),
        fetch(`https://api.alquran.cloud/v1/surah/${number}/bn.bengali`)
      ]);
      const arabicData = await arabicRes.json();
      const bengaliData = await bengaliRes.json();
      
      const combinedAyahs = arabicData.data.ayahs.map((ayah: any, index: number) => ({
        ...ayah,
        translation: bengaliData.data.ayahs[index].text
      }));
      
      setAyahs(combinedAyahs);
      setSelectedSurah(surahs.find(s => s.number === number) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async (lat: number = coords.lat, lng: number = coords.lng) => {
    try {
      // method=1 is University of Islamic Sciences, Karachi (More accurate for Bangladesh/Subcontinent)
      const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1&school=${madhab}`);
      const data = await res.json();
      setPrayerTimes(data.data.timings);
    } catch (err) {
      console.error(err);
    }
  };

  const playAyahAudio = (ayahNumber: number) => {
    if (playingAudio === ayahNumber) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahNumber}.mp3`;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAudio(ayahNumber);
    audio.play();
    audio.onended = () => setPlayingAudio(null);
  };

  const playDuaAudio = (dua: Dua) => {
    const id = parseInt(dua.id);
    if (playingAudio === id + 100000) { // Offset for Duas
      window.speechSynthesis.cancel();
      setPlayingAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(dua.arabic);
    msg.lang = 'ar-SA';
    
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.lang.startsWith('ar') && v.name.toLowerCase().includes('male'));
    if (maleVoice) {
      msg.voice = maleVoice;
    } else {
      msg.pitch = 0.8;
    }
    msg.rate = 0.9;
    
    msg.onstart = () => setPlayingAudio(id + 100000);
    msg.onend = () => setPlayingAudio(null);
    msg.onerror = () => setPlayingAudio(null);
    
    window.speechSynthesis.speak(msg);
  };

  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (ayah: Ayah) => {
    setCurrentVerseForCorrection(ayah);
    setCorrectionResult(null);
    setRecordingTime(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/aac'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
        
      const mediaRecorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (audioChunksRef.current.length === 0) {
          setCorrectionResult("দুঃখিত, কোনো অডিও রেকর্ড করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
          setLoading(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (!base64Audio) {
            setCorrectionResult("দুঃখিত, অডিও প্রসেস করতে সমস্যা হয়েছে।");
            setLoading(false);
            return;
          }

          setLoading(true);
          try {
            const result = await correctRecitation(base64Audio, ayah.text, mediaRecorder.mimeType || 'audio/webm');
            setCorrectionResult(result);
            if (result?.includes('মাশাআল্লাহ') || result?.includes('সঠিক')) {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            }
          } catch (err) {
            setCorrectionResult("দুঃখিত, তেলাওয়াত বিশ্লেষণ করতে সমস্যা হয়েছে।");
          } finally {
            setLoading(false);
          }
        };
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      // Start timer and limit to 30 seconds
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Microphone access denied", err);
      alert("মাইক্রোফোন ব্যবহারের অনুমতি প্রয়োজন। অনুগ্রহ করে ব্রাউজার সেটিং চেক করুন।");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const renderHome = () => (
    <div className="space-y-6 pb-24">
      {/* Header Section */}
      <div className="relative bg-islamic-green text-white p-8 rounded-b-[48px] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 islamic-pattern"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold serif-text tracking-tight">ফি সাবিলুল্লাহ</h1>
                <a 
                  href="https://fisabilullah.page.gd/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[8px] bg-islamic-gold text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                >
                  Visit Site
                </a>
              </div>
              <p className="text-white/70 text-sm font-medium">আসসালামু আলাইকুম {userName || 'ভাই'}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveTab('wishlist')}
                className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all border border-white/10"
              >
                <Heart size={20} className="text-islamic-gold" fill="currentColor" />
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className="p-3 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all border border-white/10"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
          
          {/* Next Prayer Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-6 border border-white/20 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mb-1">পরবর্তী নামাজ</span>
                <span className="text-xl font-bold serif-text">{getNextPrayer().name}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDistrictSelector(true)}
                  className="flex items-center gap-1 text-[10px] bg-white/20 text-white px-3 py-2 rounded-full font-bold hover:bg-white/30 transition-all"
                >
                  <MapPin size={12} />
                  {location}
                </button>
                <button 
                  onClick={() => setShowIftarModal(true)}
                  className="text-[10px] bg-islamic-gold text-white px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
                >
                  বিস্তারিত
                </button>
              </div>
            </div>
            <div className="text-5xl font-bold tracking-tighter serif-text mb-4">
              {formatTime12h(getNextPrayer().time)}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-white/50">সেহরি শেষ</span>
                <span className="font-bold text-sm">{formatTime12h(prayerTimes?.Imsak)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase tracking-wider text-white/50">ইফতার শুরু</span>
                <span className="font-bold text-sm">{formatTime12h(prayerTimes?.Maghrib)}</span>
              </div>
            </div>
          </div>

          {/* District Selector Modal */}
          <AnimatePresence>
            {showDistrictSelector && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-stone-800">আপনার জেলা নির্বাচন করুন</h2>
                    <button onClick={() => setShowDistrictSelector(false)} className="p-2 hover:bg-stone-100 rounded-full">
                      <ChevronRight className="rotate-90" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                    {districts.map(dist => (
                      <button
                        key={dist.name}
                        onClick={() => {
                          updateProfile(userName, dist.name);
                          setCoords({ lat: dist.lat, lng: dist.lng });
                          setShowDistrictSelector(false);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all text-center ${location === dist.name ? 'border-islamic-green bg-islamic-green/5 text-islamic-green font-bold' : 'border-stone-100 hover:border-islamic-green/30 text-stone-600'}`}
                      >
                        <div className="text-sm">{dist.name}</div>
                        <div className="text-[8px] opacity-40 mt-1">{dist.lat.toFixed(2)}, {dist.lng.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Home Screen Countdown */}
          <div className="mt-8 flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-2 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-islamic-gold animate-ping"></div>
              {countdownTarget}
            </div>
            <div className="text-4xl font-bold tracking-widest serif-text drop-shadow-md">
              {countdown}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Content Section */}
      <div className="px-6 space-y-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Hadith */}
          <div className="card-shadow p-5 bg-gradient-to-br from-white to-stone-50 border-l-4 border-islamic-green">
            <div className="flex items-center gap-2 text-islamic-green mb-3">
              <CheckCircle2 size={18} />
              <span className="text-sm font-bold uppercase tracking-tight">আজকের হাদিস</span>
            </div>
            <p className="text-stone-800 leading-relaxed mb-3 italic text-sm">"{HADITHS[0].text}"</p>
            <span className="text-[10px] text-stone-400">— {HADITHS[0].reference}</span>
          </div>

          {/* Daily Dua */}
          <div className="card-shadow p-5 bg-gradient-to-br from-white to-stone-50 border-l-4 border-islamic-gold">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-islamic-gold">
                <Heart size={18} />
                <span className="text-sm font-bold uppercase tracking-tight">আজকের দোয়া</span>
              </div>
              <button 
                onClick={() => playDuaAudio(DUAS[0])}
                className={`p-1.5 rounded-full transition-all ${playingAudio === parseInt(DUAS[0].id) + 100000 ? 'bg-islamic-gold text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                {playingAudio === parseInt(DUAS[0].id) + 100000 ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>
            <h4 className="font-bold text-stone-800 text-sm mb-1">{DUAS[0].title}</h4>
            <p className="text-stone-600 leading-relaxed mb-2 text-xs line-clamp-2">"{DUAS[0].translation}"</p>
            <button 
              onClick={() => {
                setActiveTab('dua');
                setDuaSearchQuery(DUAS[0].title);
              }}
              className="text-[10px] font-bold text-islamic-green hover:underline"
            >
              বিস্তারিত দেখুন →
            </button>
          </div>
        </div>
      </div>

      {/* Dua Categories Quick Access */}


      {/* Default Timer Widget */}
      <div className="px-6">
        <div className="card-shadow p-5 bg-stone-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock size={80} />
          </div>
          <div className="relative z-10">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">ডিফল্ট টাইমার</h3>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-mono font-bold">
                {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <div className="flex gap-2">
                    <button onClick={() => setTimerSeconds(prev => prev + 60)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-xs">+1m</button>
                    <button onClick={() => setTimerSeconds(prev => prev + 300)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-xs">+5m</button>
                    <button 
                      onClick={() => setIsTimerRunning(true)}
                      className="p-2 bg-islamic-green rounded-lg hover:bg-islamic-green/80"
                    >
                      <Play size={20} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsTimerRunning(false)}
                    className="p-2 bg-red-500 rounded-lg hover:bg-red-500/80"
                  >
                    <Pause size={20} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prayer Times List */}
      <div className="px-6">
        <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-islamic-green" />
            নামাজের সময়সূচী
          </div>
          <span className="text-[10px] text-stone-400 font-normal uppercase tracking-widest">({madhab === 1 ? 'হানাফী' : 'শাফেয়ী'})</span>
        </h3>
        <div className="space-y-3">
          {prayerTimes && Object.entries(prayerTimes).filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k)).map(([name, time]) => (
            <div key={name} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
              <span className="font-medium text-stone-700">{name === 'Fajr' ? 'ফজর' : name === 'Dhuhr' ? 'যুহর' : name === 'Asr' ? 'আসর' : name === 'Maghrib' ? 'মাগরিব' : 'এশা'}</span>
              <span className="font-bold text-islamic-green">{formatTime12h(time as string)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderQuran = () => {
    const filteredSurahs = surahs.filter(s => 
      s.englishName.toLowerCase().includes(quranSearchQuery.toLowerCase()) ||
      s.name.includes(quranSearchQuery) ||
      s.number.toString() === quranSearchQuery
    );

    return (
      <div className="pb-24">
        {!selectedSurah ? (
          <div className="p-6 space-y-4">
            {lastReadSurah && (
              <div 
                onClick={() => fetchSurahDetails(lastReadSurah.number)}
                className="p-4 bg-islamic-green/5 rounded-2xl border border-islamic-green/20 flex items-center justify-between cursor-pointer hover:bg-islamic-green/10 transition-colors mb-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-islamic-green/10 rounded-lg text-islamic-green">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">সর্বশেষ পড়া</h4>
                    <p className="font-bold text-stone-800">{lastReadSurah.name}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-islamic-green" />
              </div>
            )}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input 
                type="text" 
                placeholder="সূরা খুঁজুন (নাম বা নম্বর)..." 
                value={quranSearchQuery}
                onChange={(e) => setQuranSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-islamic-green/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredSurahs.map(surah => (
                <div 
                  key={surah.number}
                  onClick={() => fetchSurahDetails(surah.number)}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-islamic-green transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-sm font-bold text-islamic-green border border-stone-100 group-hover:bg-islamic-green group-hover:text-white transition-colors">
                      {surah.number}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-stone-800 group-hover:text-islamic-green transition-colors">{surah.englishName}</h4>
                      <p className="text-xs text-stone-400">{surah.englishNameTranslation} • {surah.numberOfAyahs} আয়াত</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="arabic-text text-xl font-bold text-islamic-green">{surah.name}</div>
                    <div className="flex items-center gap-2">
                      {completedSurahs.includes(surah.number) && (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteSurah(surah.number);
                        }}
                        className={`transition-colors ${favoriteSurahs.includes(surah.number) ? 'text-red-500' : 'text-stone-300 hover:text-red-500'}`}
                      >
                        <Heart size={16} fill={favoriteSurahs.includes(surah.number) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredSurahs.length === 0 && (
                <div className="text-center py-10 text-stone-400">
                  <AlertCircle size={40} className="mx-auto mb-2 opacity-20" />
                  <p>কোনো সূরা পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 p-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedSurah(null)} className="p-2 hover:bg-stone-100 rounded-full">
                  <ChevronRight className="rotate-180" />
                </button>
                <div>
                  <h2 className="font-bold text-lg">{selectedSurah.englishName}</h2>
                  <p className="text-xs text-stone-500">{selectedSurah.name} • {selectedSurah.revelationType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => playFullSurah(selectedSurah.number)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${playingFullSurah === selectedSurah.number ? 'bg-red-500 text-white animate-pulse' : 'bg-islamic-green text-white shadow-lg shadow-islamic-green/20'}`}
                >
                  {playingFullSurah === selectedSurah.number ? <Pause size={14} /> : <Play size={14} />}
                  {playingFullSurah === selectedSurah.number ? 'থামান' : 'পুরো সূরা শুনুন'}
                </button>
                <button 
                  onClick={() => toggleSurahCompletion(selectedSurah.number)}
                  className={`p-2 rounded-full transition-colors ${completedSurahs.includes(selectedSurah.number) ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}
                  title={completedSurahs.includes(selectedSurah.number) ? "পড়া শেষ হয়েছে" : "পড়া শেষ হিসেবে চিহ্নিত করুন"}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-islamic-green"></div>
                  <p className="text-xs text-stone-400 animate-pulse">সূরা লোড হচ্ছে...</p>
                </div>
              ) : (
                ayahs.map(ayah => (
                  <div key={ayah.number} className="space-y-4 border-b border-stone-100 pb-8 last:border-0 group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-stone-400 bg-stone-50 rounded-lg border border-stone-100">
                          {ayah.numberInSurah}
                        </span>
                        <div className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">আয়াত {ayah.numberInSurah}</div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => isRecording ? stopRecording() : startRecording(ayah)}
                          className={`p-2 rounded-full transition-all flex items-center gap-2 ${isRecording && currentVerseForCorrection?.number === ayah.number ? 'bg-red-500 text-white animate-pulse px-4' : 'bg-islamic-green/10 text-islamic-green hover:bg-islamic-green/20'}`}
                          title="তেলাওয়াত সংশোধন"
                        >
                          <Mic size={18} />
                          {isRecording && currentVerseForCorrection?.number === ayah.number && (
                            <span className="text-xs font-bold">{recordingTime}s</span>
                          )}
                        </button>
                        <button 
                          onClick={() => playAyahAudio(ayah.number)}
                          className={`p-2 rounded-full transition-colors ${playingAudio === ayah.number ? 'bg-islamic-gold text-white shadow-lg' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                          title="তেলাওয়াত শুনুন"
                        >
                          {playingAudio === ayah.number ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="arabic-text text-3xl leading-[2] text-right text-stone-800 drop-shadow-sm">
                      {ayah.text}
                    </div>
                    <div className="bg-stone-50/50 p-4 rounded-2xl border border-stone-100/50">
                      <p className="text-stone-600 text-sm leading-relaxed bengali-text">
                        {ayah.translation}
                      </p>
                    </div>

                    {/* Correction Result UI */}
                    <AnimatePresence>
                      {(correctionResult || (loading && currentVerseForCorrection?.number === ayah.number)) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200"
                        >
                          <div className="flex items-center gap-2 mb-2 text-islamic-green font-bold text-sm">
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-islamic-green border-t-transparent"></div>
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            {loading ? "বিশ্লেষণ করা হচ্ছে..." : "AI সংশোধন ও পরামর্শ"}
                          </div>
                          {correctionResult && (
                            <div className="text-sm text-stone-700 leading-relaxed prose prose-sm max-w-none">
                              <Markdown>{correctionResult}</Markdown>
                            </div>
                          )}
                          {!loading && correctionResult && (
                            <button 
                              onClick={() => setCorrectionResult(null)}
                              className="mt-3 text-xs font-bold text-stone-400 hover:text-stone-600"
                            >
                              বন্ধ করুন
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDua = () => {
    const categories = ['সব', 'দৈনন্দিন', 'সকাল-সন্ধ্যা', 'বিপদ-মুক্তি', 'কুরআন', 'নিয়ত', 'পবিত্রতা'];
    
    const filteredDuas = DUAS.filter(dua => {
      const matchesSearch = dua.title.toLowerCase().includes(duaSearchQuery.toLowerCase()) || 
                           dua.translation.toLowerCase().includes(duaSearchQuery.toLowerCase()) ||
                           dua.reference.toLowerCase().includes(duaSearchQuery.toLowerCase());
      const matchesCategory = selectedDuaCategory === 'সব' || dua.category === selectedDuaCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="p-6 pb-24 space-y-8">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold serif-text">দোয়া ও হাদিস</h2>
          </div>
          
          <div className="flex bg-stone-100 p-1.5 rounded-2xl shadow-inner">
            <button 
              onClick={() => {
                setDuaTab('dua');
                setSelectedHadithEdition(null);
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${duaTab === 'dua' ? 'bg-white text-islamic-green shadow-md scale-[1.02]' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Heart size={16} fill={duaTab === 'dua' ? "currentColor" : "none"} />
              দোয়া
            </button>
            <button 
              onClick={() => setDuaTab('hadith')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${duaTab === 'hadith' ? 'bg-white text-islamic-green shadow-md scale-[1.02]' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Book size={16} />
              হাদিস
            </button>
          </div>
        </div>

        {duaTab === 'dua' ? (
          <>
            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-islamic-green transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="দোয়া খুঁজুন..."
                value={duaSearchQuery}
                onChange={(e) => setDuaSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-5 bg-white rounded-[24px] border border-stone-100 focus:outline-none focus:ring-4 focus:ring-islamic-green/5 shadow-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedDuaCategory(cat)}
                  className={`px-6 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${selectedDuaCategory === cat ? 'bg-islamic-green text-white shadow-lg scale-105' : 'bg-white text-stone-500 border border-stone-100 hover:border-islamic-green/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {filteredDuas.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredDuas.map(dua => (
                    <div key={dua.id} className="card-shadow p-6 space-y-5 border-t-4 border-islamic-gold relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                        <Heart size={80} />
                      </div>
                      <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-islamic-gold bg-islamic-gold/10 px-3 py-1 rounded-full">{dua.category}</span>
                          <button 
                            onClick={() => playDuaAudio(dua)}
                            className={`p-2 rounded-xl transition-all ${playingAudio === parseInt(dua.id as string) + 100000 ? 'bg-islamic-gold text-white shadow-lg' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                          >
                            {playingAudio === parseInt(dua.id as string) + 100000 ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                        </div>
                        <button 
                          onClick={() => toggleFavoriteDua(dua.id as string)}
                          className={`transition-all hover:scale-110 ${favoriteDuas.includes(dua.id as string) ? 'text-red-500' : 'text-stone-300 hover:text-red-500'}`}
                        >
                          <Heart size={22} fill={favoriteDuas.includes(dua.id as string) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <h3 className="font-bold text-xl text-stone-800 serif-text">{dua.title}</h3>
                      <p className="arabic-text text-3xl text-right text-stone-800 leading-[2] drop-shadow-sm">{dua.arabic}</p>
                      <div className="space-y-2">
                        <p className="text-stone-600 text-sm italic leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100">"{dua.translation}"</p>
                        <div className="text-[10px] text-stone-400 uppercase tracking-widest text-right">— {dua.reference}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p>দুঃখিত, কোনো দোয়া পাওয়া যায়নি।</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {!selectedHadithEdition ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-islamic-green rounded-full"></div>
                    হাদিস গ্রন্থসমূহ
                  </h3>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="গ্রন্থ খুঁজুন (যেমন: Bukhari, Muslim, ben-bukhari)..." 
                    value={hadithSearchQuery}
                    onChange={(e) => setHadithSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-stone-100 focus:outline-none focus:ring-2 focus:ring-islamic-green/20 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                  {hadithEditions.length > 0 ? hadithEditions
                    .filter(ed => 
                      ed.name.toLowerCase().includes(hadithSearchQuery.toLowerCase()) || 
                      ed.author.toLowerCase().includes(hadithSearchQuery.toLowerCase()) ||
                      ed.editionName.toLowerCase().includes(hadithSearchQuery.toLowerCase())
                    )
                    .map(edition => (
                    <button 
                      key={edition.editionName}
                      onClick={() => {
                        setSelectedHadithEdition(edition);
                        fetchHadithsByEdition(edition.editionName);
                      }}
                      className="flex items-center justify-between p-5 bg-white rounded-3xl border border-stone-100 shadow-sm hover:border-islamic-green hover:shadow-md transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-islamic-green/5 text-islamic-green flex items-center justify-center group-hover:bg-islamic-green group-hover:text-white transition-colors">
                          <Book size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-800 group-hover:text-islamic-green transition-colors">{edition.name}</h4>
                          <p className="text-xs text-stone-400">{edition.author} • {edition.language}</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-stone-300 group-hover:text-islamic-green transition-colors" />
                    </button>
                  )) : (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green"></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 sticky top-0 bg-paper/80 backdrop-blur-md z-10 py-2">
                  <button 
                    onClick={() => setSelectedHadithEdition(null)}
                    className="p-2 bg-white rounded-xl shadow-sm border border-stone-100 text-stone-500 hover:text-islamic-green transition-colors"
                  >
                    <ChevronRight className="rotate-180" size={20} />
                  </button>
                  <div>
                    <h3 className="font-bold text-stone-800">{selectedHadithEdition.name}</h3>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">{selectedHadithEdition.author}</p>
                  </div>
                </div>

                {hadithLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-islamic-green"></div>
                    <p className="text-xs text-stone-400 font-medium animate-pulse">হাদিস লোড হচ্ছে...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {apiHadiths.map((hadith, idx) => (
                      <div key={idx} className="card-shadow p-6 space-y-5 border-l-4 border-islamic-green relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                          <Book size={80} />
                        </div>
                        <div className="flex justify-between items-center relative z-10">
                          <span className="text-[10px] font-bold text-islamic-green bg-islamic-green/10 px-3 py-1 rounded-full">হাদিস নং: {hadith.hadithNumber}</span>
                          {hadith.grades && hadith.grades.length > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest">{hadith.grades[0].grade}</span>
                          )}
                        </div>
                        <p className="text-stone-800 leading-relaxed italic font-medium bg-stone-50 p-4 rounded-2xl border border-stone-100 bengali-text">"{hadith.text}"</p>
                        <div className="text-[10px] text-stone-400 uppercase tracking-widest text-right">— {hadith.reference}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const [primaryCalendar, setPrimaryCalendar] = useState<'gregorian' | 'hijri'>('gregorian');

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const hijriToday = getHijriDate(today);

    return (
      <div className="p-6 pb-24 space-y-6">
        {/* Calendar Header Card */}
        <div className="bg-gradient-to-br from-islamic-green to-emerald-700 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold">{format(today, 'MMMM yyyy', { locale: bn })}</h2>
                <p className="text-white/80 text-lg">
                  {hijriToday.day} {hijriToday.month}, {hijriToday.year} হিজরি
                </p>
              </div>
              <button 
                onClick={() => setPrimaryCalendar(prev => prev === 'gregorian' ? 'hijri' : 'gregorian')}
                className="bg-white/20 p-2 rounded-xl backdrop-blur-md hover:bg-white/30 transition-all border border-white/10"
                title="ক্যালেন্ডার মোড পরিবর্তন করুন"
              >
                <Settings size={20} />
              </button>
            </div>
            
            <div className="mt-6 flex gap-4">
              <div className="bg-white/20 p-4 rounded-2xl flex-1 text-center">
                <div className="text-xs uppercase tracking-widest mb-1 opacity-70">সেহরি শেষ</div>
                <div className="text-xl font-bold">{formatTime12h(prayerTimes?.Imsak)}</div>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl flex-1 text-center">
                <div className="text-xs uppercase tracking-widest mb-1 opacity-70">ইফতার শুরু</div>
                <div className="text-xl font-bold">{formatTime12h(prayerTimes?.Maghrib)}</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Dual Calendar Grid */}
        <div className="card-shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-stone-800">
              {primaryCalendar === 'gregorian' ? 'ইংরেজি ক্যালেন্ডার (হিজরিসহ)' : 'হিজরি ক্যালেন্ডার (ইংরেজিসহ)'}
            </h3>
            <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
              <button 
                onClick={() => setPrimaryCalendar('gregorian')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${primaryCalendar === 'gregorian' ? 'bg-white text-islamic-green shadow-sm' : 'text-stone-400'}`}
              >
                ইংরেজি
              </button>
              <button 
                onClick={() => setPrimaryCalendar('hijri')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${primaryCalendar === 'hijri' ? 'bg-white text-islamic-green shadow-sm' : 'text-stone-400'}`}
              >
                হিজরি
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-stone-400 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: (firstDayOfMonth + 1) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = new Date(currentYear, currentMonth, i + 1);
              const isToday = i + 1 === today.getDate();
              const hijri = getHijriDate(date);
              const isMonthStart = hijri.day === '১';
              
              return (
                <div 
                  key={i} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative ${isToday ? 'bg-islamic-green text-white shadow-lg scale-110 z-10' : 'hover:bg-stone-50 text-stone-700'}`}
                >
                  {primaryCalendar === 'gregorian' ? (
                    <>
                      <span className="text-sm font-bold">{(i + 1).toLocaleString('bn-BD')}</span>
                      <span className={`text-[10px] font-bold ${isToday ? 'text-white/70' : 'text-islamic-green/70'}`}>
                        {hijri.day}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold">{hijri.day}</span>
                      <span className={`text-[10px] font-bold ${isToday ? 'text-white/70' : 'text-stone-400'}`}>
                        {(i + 1).toLocaleString('bn-BD')}
                      </span>
                    </>
                  )}
                  
                  {isMonthStart && (
                    <div className={`absolute -top-1 left-1/2 -translate-x-1/2 text-[6px] font-black uppercase px-1 rounded-sm ${isToday ? 'bg-white text-islamic-green' : 'bg-islamic-green text-white'}`}>
                      {hijri.month}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Important Islamic Events */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <Calendar size={20} className="text-islamic-green" />
            আসন্ন বিশেষ দিনসমূহ
          </h3>
          <div className="space-y-3">
            {ISLAMIC_EVENTS.map((event, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm hover:border-islamic-green transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-islamic-green bg-islamic-green/10 px-3 py-1 rounded-full">
                    {event.date}
                  </span>
                  <div className="w-2 h-2 rounded-full bg-islamic-gold opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <h4 className="font-bold text-stone-800 mb-1">{event.event}</h4>
                <p className="text-xs text-stone-500 leading-relaxed">{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const updateProfile = async (newName: string, newLocation: string, newDetails?: string) => {
    setUserName(newName);
    setLocation(newLocation);
    if (newDetails !== undefined) setUserDetails(newDetails);
    localStorage.setItem('userName', newName);
    localStorage.setItem('location', newLocation);
    if (newDetails !== undefined) {
      localStorage.setItem('userDetails', newDetails);
    }
    
    // Update coordinates immediately for prayer times
    const dist = districts.find(d => d.name === newLocation);
    if (dist) {
      setCoords({ lat: dist.lat, lng: dist.lng });
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setOnboarded(false);
    setShowSplash(true);
    setUserName('');
    setUserDetails('');
    setLocation('ঢাকা');
  };

  const handleEditProfile = () => {
    setTempUserName(userName);
    setTempLocation(location);
    setTempUserDetails(userDetails);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    await updateProfile(tempUserName, tempLocation, tempUserDetails);
    setIsEditingProfile(false);
  };

  const renderHelp = () => (
    <div className="p-6 pb-24 space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setActiveTab('profile')} className="p-2 hover:bg-stone-100 rounded-full">
          <ChevronRight className="rotate-180" />
        </button>
        <h2 className="text-2xl font-bold text-stone-800 serif-text">সাহায্য ও ফিডব্যাক</h2>
      </div>

      <div className="space-y-6">
        <div className="card-shadow p-6 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-700">১. নামাজের সময় কি সঠিক?</p>
              <p className="text-xs text-stone-500">হ্যাঁ, আমরা আল-আধান এপিআই ব্যবহার করি যা বিশ্বজুড়ে স্বীকৃত এবং সঠিক সময় প্রদান করে।</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-700">২. কুরআন অডিও কি অফলাইনে শোনা যাবে?</p>
              <p className="text-xs text-stone-500">বর্তমানে অডিও শোনার জন্য ইন্টারনেট সংযোগ প্রয়োজন।</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-700">৩. আমার ডাটা কি সুরক্ষিত?</p>
              <p className="text-xs text-stone-500">হ্যাঁ, আপনার সকল তথ্য আপনার ডিভাইসেই সংরক্ষিত থাকে।</p>
            </div>
          </div>
        </div>

        <div className="card-shadow p-6 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">যোগাযোগ করুন</h3>
          <p className="text-xs text-stone-500">যেকোনো সাহায্য বা ফিডব্যাকের জন্য আমাদের সাথে যোগাযোগ করুন।</p>
          <div className="flex flex-col gap-3">
            <a 
              href="https://wa.me/8801610340207" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-bold">হোয়াটসঅ্যাপ</p>
                  <p className="text-[10px] opacity-70">০১৬১০৩৪০২০৭</p>
                </div>
              </div>
              <ChevronRight size={16} />
            </a>
            <a 
              href="https://fisabilullah.page.gd/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-stone-50 text-stone-700 rounded-2xl border border-stone-100 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-islamic-green rounded-full flex items-center justify-center text-white">
                  <Search size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">আমাদের ওয়েবসাইট</p>
                  <p className="text-[10px] opacity-70">fisabilullah.page.gd</p>
                </div>
              </div>
              <ChevronRight size={16} />
            </a>
          </div>
        </div>

        <div className="card-shadow p-6 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">সাধারণ নিয়মাবলী</h3>
          <ul className="list-disc list-inside text-xs text-stone-500 space-y-2">
            <li>অ্যাপটি শুধুমাত্র ইবাদতের সহায়তার জন্য তৈরি।</li>
            <li>নামাজের সঠিক সময়ের জন্য আপনার জেলা সঠিকভাবে নির্বাচন করুন।</li>
            <li>যেকোনো যান্ত্রিক ত্রুটির জন্য আমাদের ফিডব্যাক দিন।</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderDonatePopup = () => (
    <AnimatePresence>
      {showDonatePopup && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
              <Heart size={40} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-2 serif-text">ফি সাবিলুল্লাহ-কে সাহায্য করুন</h2>
            <p className="text-stone-500 text-sm mb-8 leading-relaxed">
              আপনার সামান্য সাহায্য আমাদের এই দ্বীনি খেদমতকে আরও এগিয়ে নিতে সাহায্য করবে। ইনশাআল্লাহ, এটি আপনার জন্য সদকায়ে জারিয়া হিসেবে কবুল হবে।
            </p>
            <div className="space-y-3">
              <a 
                href="https://fisabilullah.page.gd/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full py-4 bg-amber-500 text-white font-bold rounded-2xl shadow-lg hover:bg-amber-600 transition-colors"
              >
                এখনই ডোনেট করুন
              </a>
              <button 
                onClick={() => setShowDonatePopup(false)}
                className="block w-full py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl hover:bg-stone-200 transition-colors"
              >
                পরে করব
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderProfile = () => (
    <div className="p-6 pb-24 space-y-8">
      <div className="flex flex-col items-center text-center py-8 relative">
        <div className="absolute top-0 right-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            Local Mode
          </div>
        </div>
        <div className="w-24 h-24 rounded-full bg-islamic-green/10 flex items-center justify-center text-islamic-green mb-4 border-4 border-white shadow-xl overflow-hidden">
          {userName ? (
            <span className="text-3xl font-bold">{userName.charAt(0)}</span>
          ) : (
            <User size={48} />
          )}
        </div>
        <div className="space-y-1">
          {isEditingProfile ? (
            <div className="space-y-3 w-full max-w-xs mx-auto">
              <input 
                type="text" 
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                className="text-xl font-bold text-stone-800 text-center bg-white border border-stone-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-islamic-green outline-none w-full"
                placeholder="আপনার নাম"
              />
              <select 
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                className="text-sm bg-white border border-stone-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-islamic-green outline-none w-full cursor-pointer"
              >
                {districts.map(d => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
              <input 
                type="text" 
                value={tempUserDetails}
                onChange={(e) => setTempUserDetails(e.target.value)}
                className="text-xs text-stone-500 text-center bg-white border border-stone-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-islamic-green outline-none w-full"
                placeholder="আপনার সম্পর্কে কিছু লিখুন..."
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-2 bg-islamic-green text-white rounded-xl text-xs font-bold hover:bg-islamic-green/90 transition-colors shadow-lg"
                >
                  সেভ করুন
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-stone-800">{userName || 'গেস্ট ইউজার'}</h2>
              <p className="text-stone-400 text-sm flex items-center justify-center gap-1">
                <MapPin size={14} />
                {location}
              </p>
              <p className="text-stone-400 text-xs italic">{userDetails || 'আপনার সম্পর্কে কিছু লিখুন...'}</p>
              <button 
                onClick={handleEditProfile}
                className="mt-4 px-6 py-2 bg-stone-100 text-stone-600 rounded-full text-xs font-bold hover:bg-stone-200 transition-colors"
              >
                প্রোফাইল এডিট করুন
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card-shadow p-5 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">ডোনেশন</h3>
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-amber-800">ফি সাবিলুল্লাহ-কে সাহায্য করুন</span>
              <span className="text-[10px] text-amber-600">আপনার সাহায্য আমাদের পথচলাকে সহজ করবে</span>
            </div>
            <button 
              onClick={() => setShowDonatePopup(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-md"
            >
              ডোনেট
            </button>
          </div>
        </div>

        <div className="card-shadow p-5 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">অ্যাকাউন্ট</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-stone-700">{userName || 'গেস্ট ইউজার'}</span>
              <span className="text-[10px] text-stone-400">আপনার নাম</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
            >
              লগআউট
            </button>
          </div>
        </div>

        <div className="card-shadow p-5 space-y-4">
          <h3 className="font-bold text-stone-800 border-b border-stone-100 pb-2">অ্যাপ সেটিংস</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-700">নামাজের নোটিফিকেশন</span>
            </div>
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-islamic-green' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-700">মাযহাব নির্বাচন</span>
            </div>
            <select 
              value={madhab} 
              onChange={(e) => setMadhab(Number(e.target.value))}
              className="text-xs bg-stone-100 px-3 py-1 rounded-lg font-bold border-none focus:ring-0"
            >
              <option value={1}>হানাফী</option>
              <option value={0}>শাফেয়ী</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-700">সাহায্য ও ফিডব্যাক</span>
            </div>
            <button 
              onClick={() => setActiveTab('help')}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-stone-300" />
            </button>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">দৈনিক রিমাইন্ডার সেটিংস</h4>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-islamic-green"></div>
                    <span className="text-sm font-bold text-stone-700">সুন্নাহ রিমাইন্ডার</span>
                  </div>
                  <button 
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${reminderEnabled ? 'bg-islamic-green' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${reminderEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">রিমাইন্ডারের সময়</span>
                    <input 
                      type="time" 
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="text-xs bg-white p-2 rounded-lg font-bold border border-stone-200 focus:ring-1 focus:ring-islamic-green outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-stone-500">রিমাইন্ডার মেসেজ</span>
                    <input 
                      type="text" 
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      className="w-full text-xs bg-white p-2 rounded-lg font-bold border border-stone-200 focus:ring-1 focus:ring-islamic-green outline-none"
                      placeholder="মেসেজ লিখুন..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">কাস্টম অ্যালার্ম সেটিংস</h4>
              <button 
                onClick={() => playAlarmSound()}
                className="text-[10px] font-bold text-islamic-green bg-islamic-green/10 px-2 py-1 rounded-md"
              >
                অ্যালার্ম টেস্ট করুন
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-islamic-green"></div>
                    <span className="text-sm font-bold text-stone-700">সেহরি অ্যালার্ম</span>
                  </div>
                  <button 
                    onClick={() => setSehriAlarmEnabled(!sehriAlarmEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${sehriAlarmEnabled ? 'bg-islamic-green' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${sehriAlarmEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">কত মিনিট আগে সতর্কবার্তা?</span>
                  <input 
                    type="number" 
                    value={sehriAlarmOffset}
                    onChange={(e) => setSehriAlarmOffset(Math.max(0, Number(e.target.value)))}
                    className="w-14 text-center text-xs bg-white p-2 rounded-lg font-bold border border-stone-200 focus:ring-1 focus:ring-islamic-green outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-islamic-gold"></div>
                    <span className="text-sm font-bold text-stone-700">ইফতার অ্যালার্ম</span>
                  </div>
                  <button 
                    onClick={() => setIftarAlarmEnabled(!iftarAlarmEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${iftarAlarmEnabled ? 'bg-islamic-gold' : 'bg-stone-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${iftarAlarmEnabled ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">কত মিনিট আগে সতর্কবার্তা?</span>
                  <input 
                    type="number" 
                    value={iftarAlarmOffset}
                    onChange={(e) => setIftarAlarmOffset(Math.max(0, Number(e.target.value)))}
                    className="w-14 text-center text-xs bg-white p-2 rounded-lg font-bold border border-stone-200 focus:ring-1 focus:ring-islamic-gold outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: Heart, label: 'উইশলিস্ট', onClick: () => setActiveTab('wishlist') },
            { icon: AlertCircle, label: 'সাহায্য ও ফিডব্যাক', onClick: () => setActiveTab('help') }
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-islamic-green transition-colors"
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} className="text-stone-400" />
                <span className="font-medium text-stone-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-stone-300" />
            </button>
          ))}
        </div>
      </div>

      <button className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100">
        লগ আউট
      </button>
    </div>
  );

  const renderWishlist = () => {
    const favDuas = DUAS.filter(d => favoriteDuas.includes(d.id));
    const favSurahs = surahs.filter(s => favoriteSurahs.includes(s.number));

    return (
      <div className="p-6 pb-24 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">উইশলিস্ট</h2>
          <Heart className="text-red-500" fill="currentColor" size={24} />
        </div>

        {favSurahs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Book size={14} /> পছন্দের সূরাসমূহ
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {favSurahs.map(surah => (
                <div 
                  key={surah.number}
                  onClick={() => {
                    setActiveTab('quran');
                    fetchSurahDetails(surah.number);
                  }}
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-islamic-green transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-sm font-bold text-islamic-green border border-stone-100">
                      {surah.number}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-stone-800">{surah.englishName}</h4>
                      <p className="text-xs text-stone-400">{surah.englishNameTranslation}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="arabic-text text-xl font-bold text-islamic-green">{surah.name}</div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteSurah(surah.number);
                      }}
                      className="text-red-500"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {favDuas.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <Heart size={14} /> পছন্দের দোয়া
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {favDuas.map(dua => (
                <div key={dua.id} className="card-shadow p-5 space-y-4 border-l-4 border-islamic-gold">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-islamic-gold bg-islamic-gold/10 px-2 py-1 rounded-full">{dua.category}</span>
                      <button 
                        onClick={() => playDuaAudio(dua)}
                        className={`p-1.5 rounded-full transition-all ${playingAudio === parseInt(dua.id) + 100000 ? 'bg-islamic-gold text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                      >
                        {playingAudio === parseInt(dua.id) + 100000 ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => toggleFavoriteDua(dua.id)}
                      className="text-red-500"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  </div>
                  <h3 className="font-bold text-lg text-stone-800">{dua.title}</h3>
                  <p className="arabic-text text-2xl text-right text-stone-800 leading-loose">{dua.arabic}</p>
                  <p className="text-stone-600 text-sm italic leading-relaxed">"{dua.translation}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {favSurahs.length === 0 && favDuas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Heart size={48} className="mb-4 opacity-20" />
            <p>আপনার পছন্দের তালিকায় কিছু নেই।</p>
          </div>
        )}
      </div>
    );
  };

  const renderTools = () => {
    const nisabGold = 850000; // Approximate nisab in BDT
    const zakatPayable = (zakatAmount && zakatAmount >= nisabGold) ? zakatAmount * 0.025 : 0;

    return (
      <div className="p-6 pb-24 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold serif-text">ইসলামিক টুলস</h2>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button 
              onClick={() => setToolTab('tasbih')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolTab === 'tasbih' ? 'bg-white text-islamic-green shadow-sm' : 'text-stone-400'}`}
            >
              তসবিহ
            </button>
            <button 
              onClick={() => setToolTab('zakat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolTab === 'zakat' ? 'bg-white text-islamic-green shadow-sm' : 'text-stone-400'}`}
            >
              যাকাত
            </button>
            <button 
              onClick={() => setToolTab('names')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${toolTab === 'names' ? 'bg-white text-islamic-green shadow-sm' : 'text-stone-400'}`}
            >
              নামসমূহ
            </button>
          </div>
        </div>

        {toolTab === 'tasbih' && (
          <div className="space-y-8 flex flex-col items-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-stone-100"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 120}
                  animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - tasbihCount / tasbihTarget) }}
                  className="text-islamic-green"
                  strokeLinecap="round"
                />
              </svg>
              
              <button 
                onClick={() => {
                  if (tasbihCount < tasbihTarget) {
                    setTasbihCount(prev => prev + 1);
                    if (tasbihCount + 1 === tasbihTarget) {
                      if ('vibrate' in navigator) navigator.vibrate(200);
                    }
                  } else {
                    setTasbihCount(1);
                  }
                }}
                className="relative z-10 w-48 h-48 bg-white rounded-full shadow-2xl border-8 border-stone-50 flex flex-col items-center justify-center active:scale-95 transition-transform group"
              >
                <span className="text-5xl font-bold text-stone-800">{tasbihCount}</span>
                <span className="text-xs text-stone-400 mt-2">লক্ষ্য: {tasbihTarget}</span>
                <div className="absolute inset-0 rounded-full bg-islamic-green/5 scale-0 group-active:scale-100 transition-transform duration-300"></div>
              </button>
            </div>

            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setTasbihCount(0)}
                className="flex-1 py-4 bg-white rounded-2xl border border-stone-100 text-stone-600 font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCcw size={18} /> রিসেট
              </button>
              <div className="flex-1 flex bg-white rounded-2xl border border-stone-100 p-1 shadow-sm">
                {[33, 99, 100].map(target => (
                  <button
                    key={target}
                    onClick={() => {
                      setTasbihTarget(target);
                      setTasbihCount(0);
                    }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tasbihTarget === target ? 'bg-islamic-green text-white shadow-md' : 'text-stone-400'}`}
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-shadow p-6 w-full bg-stone-50 border border-stone-100 rounded-3xl">
              <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Hash size={18} className="text-islamic-green" /> তসবিহ পাঠের ফজিলত
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed italic">
                "যে ব্যক্তি প্রতি নামাজের পর ৩৩ বার সুবহানাল্লাহ, ৩৩ বার আলহামদুলিল্লাহ এবং ৩৩ বার আল্লাহু আকবার পাঠ করবে, তার সকল গুনাহ ক্ষমা করে দেওয়া হবে।" (সহীহ মুসলিম)
              </p>
            </div>
          </div>
        )}

        {toolTab === 'zakat' && (
          <div className="space-y-8">
            <div className="card-shadow p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">মোট সম্পদের পরিমাণ (টাকা)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400">৳</span>
                  <input 
                    type="number" 
                    value={zakatAmount || ''}
                    onChange={(e) => setZakatAmount(Number(e.target.value))}
                    placeholder="যেমন: ৫,০০,০০০"
                    className="w-full pl-10 pr-4 py-5 bg-stone-50 rounded-2xl border border-stone-100 focus:ring-2 focus:ring-islamic-green/20 outline-none font-bold text-xl"
                  />
                </div>
              </div>

              <div className="p-6 bg-islamic-green text-white rounded-3xl space-y-4 relative overflow-hidden shadow-xl shadow-islamic-green/20">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Calculator size={80} />
                </div>
                <div className="relative z-10">
                  <span className="text-xs uppercase tracking-widest opacity-70">প্রদেয় যাকাত</span>
                  <div className="text-4xl font-bold serif-text mt-1">৳ {zakatPayable.toLocaleString('bn-BD')}</div>
                  <p className="text-[10px] mt-4 opacity-80 leading-relaxed">
                    {zakatAmount < nisabGold ? `আপনার সম্পদ নিসাব পরিমাণ (৳${nisabGold.toLocaleString('bn-BD')}) এর কম।` : 'আপনার সম্পদের ২.৫% যাকাত হিসেবে প্রদান করতে হবে।'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-stone-800 flex items-center gap-2">
                <AlertCircle size={18} className="text-islamic-gold" /> যাকাতের নিয়মাবলী
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  'নিসাব পরিমাণ সম্পদ এক বছর পূর্ণ হলে যাকাত ফরজ হয়।',
                  'স্বর্ণের নিসাব ৭.৫ তোলা বা ৮৭.৪৫ গ্রাম।',
                  'রূপার নিসাব ৫২.৫ তোলা বা ৬১২.৩৬ গ্রাম।',
                  'নগদ টাকা, ব্যবসায়িক পণ্য এবং শেয়ারের ওপরও যাকাত প্রযোজ্য।'
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-white rounded-2xl border border-stone-100 text-sm text-stone-600 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-islamic-gold mt-1.5 shrink-0"></div>
                    <p>{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {toolTab === 'names' && (
          <div className="grid grid-cols-2 gap-4">
            {ALLAH_NAMES.map(name => (
              <motion.div 
                key={name.id}
                whileHover={{ scale: 1.02 }}
                className="card-shadow p-5 bg-white rounded-3xl border border-stone-100 text-center space-y-3"
              >
                <div className="text-3xl arabic-text text-islamic-green">{name.name}</div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-stone-800">{name.transliteration}</div>
                  <div className="text-[10px] text-stone-400">{name.translation}</div>
                </div>
              </motion.div>
            ))}
            <div className="col-span-2 p-4 text-center text-[10px] text-stone-400 uppercase tracking-widest">
              বাকি নামসমূহ শীঘ্রই আসছে...
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCanvas = () => (
    <div className="p-6 pb-24 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold serif-text">অ্যাপ ক্যানভাস</h2>
        <div className="text-[10px] font-bold text-islamic-green bg-islamic-green/10 px-3 py-1 rounded-full">ভার্সন ২.৫.০</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-shadow p-6 bg-islamic-green text-white col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Book size={120} />
          </div>
          <h3 className="text-lg font-bold mb-2">ফি সাবিলুল্লাহ ইকোসিস্টেম</h3>
          <p className="text-xs text-white/70 leading-relaxed">একটি পূর্ণাঙ্গ ইসলামিক জীবনধারা অ্যাপ যা আপনার দৈনন্দিন ইবাদতকে সহজ ও সুন্দর করে তোলে।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mic size={20} />
          </div>
          <h4 className="font-bold text-sm">AI তেলাওয়াত</h4>
          <p className="text-[10px] text-stone-500">আপনার তেলাওয়াত সংশোধন করতে সাহায্য করে।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <h4 className="font-bold text-sm">স্মার্ট অ্যালার্ম</h4>
          <p className="text-[10px] text-stone-500">সেহরি ও ইফতারের কাস্টম অ্যালার্ম।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Heart size={20} />
          </div>
          <h4 className="font-bold text-sm">উইশলিস্ট</h4>
          <p className="text-[10px] text-stone-500">প্রিয় সূরা ও দোয়া সংরক্ষণের সুবিধা।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <h4 className="font-bold text-sm">হিজরি ক্যালেন্ডার</h4>
          <p className="text-[10px] text-stone-500">ইসলামিক বিশেষ দিনসমূহের তালিকা।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <MapPin size={20} />
          </div>
          <h4 className="font-bold text-sm">কিবলা কম্পাস</h4>
          <p className="text-[10px] text-stone-500">সঠিক কিবলা দিক নির্ণয়।</p>
        </div>

        <div className="card-shadow p-5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <h4 className="font-bold text-sm">যাকাত ক্যালকুলেটর</h4>
          <p className="text-[10px] text-stone-500">সহজ যাকাত হিসাব করার টুল।</p>
        </div>
      </div>

      <div className="card-shadow p-6 space-y-4">
        <h3 className="font-bold text-stone-800 flex items-center gap-2">
          <Settings size={18} className="text-islamic-green" />
          আসন্ন ফিচারসমূহ
        </h3>
        <div className="space-y-3">
          {[
            'তসবিহ কাউন্টার (ডিজিটাল)',
            'নিকটস্থ মসজিদ ম্যাপ',
            'ইসলামিক কুইজ ও শিক্ষা',
            'হাদিস লাইব্রেরি (পূর্ণাঙ্গ)'
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-stone-600">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleGetStarted = () => {
    if (userName.trim()) {
      localStorage.setItem('userName', userName);
      localStorage.setItem('location', location);
      localStorage.setItem('onboarded', 'true');
      setOnboarded(true);
      setShowSplash(false);
      getUserLocation();
    }
  };

  const renderSplash = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-islamic-green flex flex-col items-center justify-center p-8 text-center overflow-hidden"
    >
      <div className="absolute inset-0 islamic-pattern opacity-20"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 space-y-8 w-full max-w-md"
      >
        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[32px] flex items-center justify-center mx-auto border border-white/20 shadow-2xl">
          <Book size={48} className="text-islamic-gold" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white serif-text tracking-tight">ফি সাবিলুল্লাহ</h1>
          <p className="text-white/70 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">
            আপনার দৈনন্দিন ইবাদত ও সুন্নাহ পালনের পূর্ণাঙ্গ ডিজিটাল সঙ্গী
          </p>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">আপনার নাম</label>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="আপনার নাম লিখুন"
              className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white placeholder:text-white/30 focus:ring-2 focus:ring-islamic-gold/50 outline-none font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">আপনার জেলা</label>
            <select 
              value={location}
              onChange={(e) => {
                const district = districts.find(d => d.name === e.target.value);
                if (district) {
                  setLocation(district.name);
                  setCoords({ lat: district.lat, lng: district.lng });
                }
              }}
              className="w-full p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white focus:ring-2 focus:ring-islamic-gold/50 outline-none font-bold appearance-none"
            >
              {districts.map(d => (
                <option key={d.name} value={d.name} className="text-stone-800">{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleGetStarted}
          disabled={loading || !userName.trim()}
          className="w-full py-5 bg-islamic-gold text-white font-bold rounded-[24px] shadow-2xl hover:scale-105 active:scale-95 transition-all text-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'অ্যাপে প্রবেশ করুন'
          )}
        </button>
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-islamic-gold/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
    </motion.div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-paper font-sans relative">
      <AnimatePresence>
        {showSplash && renderSplash()}
      </AnimatePresence>

      <main className="min-h-screen">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'quran' && renderQuran()}
        {activeTab === 'dua' && renderDua()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'wishlist' && renderWishlist()}
        {activeTab === 'canvas' && renderCanvas()}
        {activeTab === 'tools' && renderTools()}
        {activeTab === 'help' && renderHelp()}
      </main>

      {renderDonatePopup()}

      {/* Full Screen Iftar Countdown Modal */}
      <AnimatePresence>
        {showIftarModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] bg-islamic-green text-white flex flex-col items-center justify-center p-8 text-center"
          >
            <button 
              onClick={() => setShowIftarModal(false)}
              className="absolute top-8 right-8 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <AlertCircle className="rotate-45" />
            </button>
            
            <div className="mb-12">
              <Clock size={80} className="mx-auto mb-6 text-islamic-gold animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">{countdownTarget}</h2>
              <p className="text-white/70">{location} • হানাফী মাযহাব</p>
            </div>

            <div className="text-8xl font-bold mb-12 tracking-tighter font-mono drop-shadow-2xl">
              {countdown}
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[40px] border border-white/20 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-xl mb-4 text-islamic-gold flex items-center justify-center gap-2">
                <Heart size={20} />
                সহীহ সুন্নাহ ও দোয়া
              </h3>
              <div className="space-y-6 text-left">
                {countdownTarget === 'সেহরির বাকি আছে' ? (
                  <>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">খাবার শেষ করার সহীহ দোয়া (আবু দাউদ: ৪০২৩)</p>
                      <div className="arabic-text text-2xl text-right mb-2 leading-relaxed">
                        الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ
                      </div>
                      <p className="text-sm italic opacity-90">
                        "সেই আল্লাহর প্রশংসা যিনি আমাকে এটি খাইয়েছেন এবং আমার কোনো প্রচেষ্টা ও শক্তি ছাড়াই আমাকে এটি দান করেছেন।"
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">সেহরির সুন্নাহ ও নিয়ত</p>
                      <ul className="text-xs space-y-2 opacity-90 list-disc pl-4">
                        <li>সেহরি খাওয়া বরকতময়, তাই অল্প হলেও সেহরি খাওয়া সুন্নাহ।</li>
                        <li>সেহরির শেষ সময়ে খাবার গ্রহণ করা উত্তম।</li>
                        <li>রোজার নিয়ত মনে মনে করাই যথেষ্ট, মুখে বলা জরুরি নয়।</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">ইফতারের সহীহ দোয়া (আবু দাউদ: ২৩৫৭)</p>
                      <div className="arabic-text text-2xl text-right mb-2 leading-relaxed">
                        ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
                      </div>
                      <p className="text-sm italic opacity-90">
                        "পিপাসা মিটেছে, শিরাগুলো সিক্ত হয়েছে এবং ইনশাআল্লাহ পুরস্কার নির্ধারিত হয়েছে।"
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">রাসূল (সা.)-এর ইফতারের নিয়ম</p>
                      <ul className="text-xs space-y-2 opacity-90 list-disc pl-4">
                        <li>সূর্যাস্তের সাথে সাথে দ্রুত ইফতার করা।</li>
                        <li>তাজা খেজুর (রুতাব) দিয়ে শুরু করা, না থাকলে শুকনো খেজুর (তামর), অন্যথায় পানি।</li>
                        <li>ইফতারের পর উপরের দোয়াটি পাঠ করা।</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={() => setShowIftarModal(false)}
              className="mt-12 px-8 py-4 bg-white text-islamic-green font-bold rounded-2xl shadow-xl active:scale-95 transition-transform"
            >
              বন্ধ করুন
            </button>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Daily Sunnah Reminder Modal */}
        <AnimatePresence>
          {showDailySunnahModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-islamic-green/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-islamic-gold"></div>
                
                <div className="w-20 h-20 bg-islamic-green/10 rounded-full flex items-center justify-center mx-auto mb-6 text-islamic-green">
                  <Heart size={40} className="animate-pulse" />
                </div>

                <h2 className="text-2xl font-bold text-stone-800 mb-2">রাসূল (সা.)-এর সুন্নাহ</h2>
                <p className="text-stone-400 text-xs uppercase tracking-widest mb-6">প্রতিদিনের আমল ও দোয়া</p>

                <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 text-left mb-8">
                  <h3 className="font-bold text-islamic-green mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {DAILY_SUNNAHS[new Date().getDate() % DAILY_SUNNAHS.length].title}
                  </h3>
                  <p className="text-stone-700 text-sm leading-relaxed italic mb-4">
                    "{DAILY_SUNNAHS[new Date().getDate() % DAILY_SUNNAHS.length].text}"
                  </p>
                  <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                    — {DAILY_SUNNAHS[new Date().getDate() % DAILY_SUNNAHS.length].reference}
                  </div>
                </div>

                <button 
                  onClick={() => setShowDailySunnahModal(false)}
                  className="w-full py-4 bg-islamic-green text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  আল্লাহ কবুল করুন
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-nav px-8 py-3 flex justify-between items-center z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-t-[32px]">
        {[
          { id: 'home', icon: Home, label: 'হোম' },
          { id: 'quran', icon: Book, label: 'কুরআন' },
          { id: 'dua', icon: Heart, label: 'দোয়া' },
          { id: 'tools', icon: Calculator, label: 'টুলস' },
          { id: 'profile', icon: User, label: 'প্রোফাইল' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className="relative flex flex-col items-center gap-1 group py-2"
          >
            <motion.div
              animate={{
                scale: activeTab === item.id ? 1.1 : 1,
                y: activeTab === item.id ? -4 : 0
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-islamic-green text-white shadow-lg shadow-islamic-green/20' : 'text-stone-400'}`}>
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${activeTab === item.id ? 'text-islamic-green' : 'text-stone-400'}`}>
                {item.label}
              </span>
            </motion.div>
          </button>
        ))}
      </nav>

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[100] flex items-center justify-center">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-islamic-green border-t-transparent"></div>
            <p className="text-sm font-bold text-stone-600">বিশ্লেষণ করা হচ্ছে...</p>
          </div>
        </div>
      )}
    </div>
  );
}
