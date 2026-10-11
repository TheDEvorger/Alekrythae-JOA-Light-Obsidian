/**
 * JOA'nın izin verilen tek görsel emoji sözlüğü.
 * Yalnızca cansız fantastik dünya nesneleri ve doğa öğeleri içerir.
 * İnsan/insansı yüzler, maskeler, teknoloji, ofis araçları, kare simgeler ve
 * mezar taşı yasaktır. Kanonik ⟡ işareti emoji değil, isim ayıracıdır.
 * Yeni simge ancak bu sözlük ve regresyon testi güncellenerek eklenebilir.
 */
export const FANTASY_EMOJI = Object.freeze({
  meggy: "🍲",           // Han yemeği
  bag: "🎒",             // Yolcunun çantası
  living: "🌿",          // Yaşam
  dead: "🥀",            // Solan çiçek
  castle: "🏰",          // Kale
  roster: "🗺️",          // Mevcudat dünya haritası
  crown: "👑",           // Hanedan
  npc: "🕯️",            // Han mumu
  vessel: "⛵",          // Yelkenli
  scrying: "🔮",         // Yalnız Diğer kategorisi
  portrait: "💠",        // Yalnız portre seçimi
  speech: "🗝️",          // Yalnız F3 konuşma metni etiketi
  scroll: "📜",          // Parşömen
  die: "🎲",             // Zar
  gem: "💎",             // Mücevher
  compass: "🧭",        // Yalnız D240 keşif etiketi
  swords: "⚔️",         // Çapraz kılıçlar
  vortex: "🌀",         // Büyü girdabı
  moon: "🌒",            // Hilal
  fire: "🔥",            // Ateş
  forest: "🌲",          // Orman
  place: "🏔️",          // Mekan türü, dağlar ve diyarlar
  autumnLeaf: "🍂"      // Han başlığının sonundaki yaprak
} as const);

export const APPROVED_FANTASY_EMOJI: readonly string[] = Object.freeze(
  Array.from(new Set(Object.values(FANTASY_EMOJI)))
);
