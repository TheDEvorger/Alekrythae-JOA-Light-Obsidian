/** Twenty-four distinct fantasy atmospheres; palette and ornament shape are independently tuned. */
export interface FantasyTheme {
  id: string; name: string; bg: string; panel: string; ink: string;
  muted: string; gold: string; line: string; glow: string;
  radius: string; surface: string; ornament: string;
}
const tuples: Array<[string,string,string,string,string,string,string,string,string,string,string,string]> = [
  ["moon-citadel","Ay Kalesi","#061b25","#071b27","#eee5cc","#b4c7c4","#d9ae68","#5ba9b6","#42d1e9","12px","glass","runes"],
  ["emerald-grove","Zümrüt Korusu","#0b241a","#0c291f","#e5efd6","#bbd1ad","#d2b66e","#75ab78","#8fd689","20px","leaf","vines"],
  ["ember-throne","Kor Kalesi","#29120f","#29170f","#ffe0c2","#d9a58d","#f3a25c","#b7533f","#ff6c39","4px","embers","crest"],
  ["winter-chapel","Buz Hisarı","#11293a","#102536","#eef7ff","#a9c9de","#a3d4ee","#8cbed4","#d1fbff","2px","frost","spires"],
  ["ruby-court","Yakut Sarayı","#300b20","#2e0b1f","#ffe0df","#e3a7b2","#efacb0","#ad466e","#fd779b","18px","velvet","gems"],
  ["forest-tavern","Orman Hanı","#171e12","#252516","#f8e5be","#c9b38b","#c59a52","#88784b","#c2a05a","10px","wood","timber"],
  ["violet-arcana","Menekşe Vadisi","#211132","#231536","#f5e4ff","#c6b0dd","#cba3eb","#8158c1","#ad87ff","24px","arcana","runes"],
  ["sunken-atlantis","Batık Şehir","#05272e","#072b37","#d9f5ef","#9bbeca","#98d8c4","#3a8797","#57ded1","16px","ocean","waves"],
  ["dusk-bastion","Alacakaranlık Kulesi","#211b31","#1f1b34","#f2ddec","#bdb0cf","#e3a5c3","#6e6596","#d2a9ff","8px","mist","spires"],
  ["bronze-forge","Bronz Ocağı","#292015","#2e2317","#ffe7c4","#c1ad89","#f0c17b","#9e7752","#f6a04f","3px","metal","rivets"],
  ["sapphire-harbor","Safir Limanı","#0a1a38","#0a2040","#e5ecff","#b1c4e2","#dfc9a3","#548ac5","#91b9ff","14px","water","waves"],
  ["ashen-moor","Kül Bataklığı","#222722","#202521","#dce8cf","#aab4a1","#b9c394","#718177","#9dd8aa","1px","stone","cracks"],
  ["royal-onyx","Kraliyet Oniksi","#101016","#17151c","#f5eedf","#bdafaa","#ecc478","#605468","#e7bd87","2px","onyx","crest"],
  ["rose-cathedral","Gül Bahçesi","#311e28","#2d1b2b","#ffe9e5","#d5bdbe","#f3c1b1","#a97786","#fca5bb","26px","rose","vines"],
  ["ancient-parchment","Sarı Parşömen","#392f1f","#36291b","#fff1d0","#d7bc8c","#eac681","#ab925e","#f7d68e","3px","paper","script"],
  ["starlit-observatory","Yıldız Rasathanesi","#101a36","#101730","#f0eaff","#babfe2","#c5c5ff","#6b6eb7","#9ebdff","50px","stars","constellation"],
  ["jade-temple","Yeşim Avlusu","#072620","#082a24","#e0f9e2","#add9bf","#a7dba9","#438f72","#8cf9b6","5px","jade","arches"],
  ["crimson-dragon","Kızıl Ejder","#300e12","#340f12","#ffe1d9","#ecaea5","#ffc28c","#b34549","#ff7e63","9px","scale","scales"],
  ["silver-cemetery","Gümüş Harabeler","#1e242b","#1b2731","#e9eff5","#b1bbc7","#cad2db","#6e8597","#d8ecfb","2px","fog","cracks"],
  ["golden-desert","Altın Çöl","#372312","#3b2816","#ffebcc","#e0c4a2","#f1c75c","#bc8c48","#ffde91","28px","sand","dunes"],
  ["celestial-garden","Bulut Bahçesi","#10282c","#0f3234","#f0f4e8","#b1d0d1","#f0d1b4","#63a8a7","#83e3e4","18px","bloom","vines"],
  ["storm-keep","Fırtına Kalesi","#101924","#151f2d","#ebf5f8","#a5bccf","#e2d69f","#5f849f","#87c4ef","0px","storm","lightning"],
  ["amethyst-crypt","Ametist Mahzeni","#22172b","#231629","#f7e6f9","#c8abc8","#e5a5f2","#855e89","#d187eb","6px","crystal","gems"],
  ["dawn-sanctuary","Şafak Sığınağı","#2d2229","#30212a","#ffebde","#dab5ad","#ffd399","#aa8a88","#ffc8aa","20px","sunrise","arches"]
];
export const FANTASY_THEMES: readonly FantasyTheme[] = Object.freeze(tuples.map((v) => ({
  id:v[0], name:v[1], bg:v[2], panel:v[3], ink:v[4], muted:v[5],
  gold:v[6], line:v[7], glow:v[8], radius:v[9], surface:v[10], ornament:v[11]
})));
export function selectTheme(id: string): FantasyTheme {
  return FANTASY_THEMES.find((item) => item.id === id) ?? FANTASY_THEMES[0];
}
