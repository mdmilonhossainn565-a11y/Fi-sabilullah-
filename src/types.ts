export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  translation?: string;
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface Dua {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  reference: string;
  category: string;
}

export interface Hadith {
  id?: string | number;
  hadithNumber?: number | string;
  arabicNumber?: number | string;
  arabic?: string;
  text: string;
  reference?: string;
  category?: string;
  book?: string;
  grades?: { name: string; grade: string }[];
}

export interface HadithEdition {
  name: string;
  author: string;
  language: string;
  description: string;
  editionName: string; // The key in editions.json
}

export interface AllahName {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
}
