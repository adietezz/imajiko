/**
 * Imajiko Product Catalog Database
 * Add, remove, or modify objects in this array to update the store catalog dynamically.
 */
const cardsData = [
  {
    id: "card-birthday",
    category: "birthday",
    frontImage: "images/card_pagoda.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #02",
    title: "SENGANTO BIRTHDAY / 誕生日",
    desc: "Kejutan ulang tahun spesial bernuansa kuil pagoda retro. Lengkap dengan lilin tiup digital interaktif dan balon terbang.",
    price: "Rp 35.000",
    originalPrice: "Rp 50.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/ultah",
    lcdImage: "images/lcd_pagoda.png",
    lcdOverlay: "balloons"
  },
  {
    id: "card-anniversary",
    category: "anniversary",
    frontImage: "images/card_fuji.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #01",
    title: "FUJI ANNIVERSARY / 記念日",
    desc: "Ungkapkan perasaan cintamu berlatar Gunung Fuji yang syahdu. Fitur hitung mundur jadian dan amplop surat cinta.",
    price: "Rp 45.000",
    originalPrice: "Rp 65.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/anniv",
    lcdImage: "images/lcd_fuji.png",
    lcdOverlay: "countdown"
  },
  {
    id: "card-graduation",
    category: "graduation",
    frontImage: "images/card_shibuya.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #03",
    title: "SHIBUYA GRADUATION / 卒業",
    desc: "Rayakan kelulusan kuliah/sekolah di megahnya jalanan neon Shibuya. Fitur interaktif melempar toga kelulusan.",
    price: "Rp 39.000",
    originalPrice: "Rp 55.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/wisuda",
    lcdImage: "images/lcd_shibuya.png",
    lcdOverlay: "graduationCaps"
  },
  {
    id: "card-retro-birthday",
    category: "birthday",
    frontImage: "images/card_retro_arcade.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #04",
    title: "RETRO ARCADE BIRTHDAY / 誕生日",
    desc: "Rayakan ulang tahun bergaya gamer 80-an dengan lilin neon tiup dan kabinet arcade interaktif.",
    price: "Rp 37.000",
    originalPrice: "Rp 50.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/ultah",
    lcdImage: "images/lcd_arcade.png",
    lcdOverlay: "arcade"
  },
  {
    id: "card-sakura-anniv",
    category: "anniversary",
    frontImage: "images/card_sakura.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #05",
    title: "SAKURA CONFESSION / 告白",
    desc: "Ungkapkan cinta berlatar jembatan sakura romantis dengan kelopak bunga berguguran di layar ponsel.",
    price: "Rp 42.000",
    originalPrice: "Rp 60.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/anniv",
    lcdImage: "images/lcd_sakura.png",
    lcdOverlay: "sakuraPetals"
  },
  {
    id: "card-kyoto-starry",
    category: "anniversary",
    frontImage: "images/card_starry_night.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #06",
    title: "KYOTO STARRY NIGHT / 記念日",
    desc: "Ungkapkan momen anniversary di sejuknya Kyoto dengan pemandangan rasi bintang berkelip yang indah.",
    price: "Rp 47.000",
    originalPrice: "Rp 70.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/anniv",
    lcdImage: "images/lcd_starry.png",
    lcdOverlay: "starryStars"
  },
  {
    id: "card-harajuku-grad",
    category: "graduation",
    frontImage: "images/card_shibuya.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #07",
    title: "HARAJUKU GRADUATION / 卒業",
    desc: "Rayakan kelulusan meriah bertema Harajuku dengan street fashion pixelated yang unik dan estetik.",
    price: "Rp 39.000",
    originalPrice: "Rp 55.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/wisuda",
    lcdImage: "images/lcd_harajuku.png",
    lcdOverlay: "harajukuRun"
  },
  {
    id: "card-eid-mubarak",
    category: "festive",
    frontImage: "images/card_pagoda.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #08",
    title: "EID MUBARAK PIXEL / 祝日",
    desc: "Kartu ucapan Lebaran digital bertema masjid pixel art Jepang dengan dekorasi lampion bersinar interaktif.",
    price: "Rp 35.000",
    originalPrice: "Rp 50.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/lebaran",
    lcdImage: "images/lcd_mosque.png",
    lcdOverlay: "mosque"
  },
  {
    id: "card-neon-christmas",
    category: "festive",
    frontImage: "images/card_neon_christmas.png",
    badge: "BEST DEAL",
    rarityTag: "BEST DEAL #09",
    title: "NEON CHRISTMAS CABIN / クリスマス",
    desc: "Ucapan Natal bersalju di pondok kayu Jepang, lengkap dengan efek hujan salju neon di layar handphone.",
    price: "Rp 35.000",
    originalPrice: "Rp 50.000",
    tiktokUrl: "https://tiktok.com/@imajiko.store",
    checkoutUrl: "https://lynk.id/imajiko/natal",
    lcdImage: "images/lcd_christmas.png",
    lcdOverlay: "christmasSnow"
  }
];

// Ensure availability on the global window object across script boundaries
if (typeof window !== "undefined") {
  window.cardsData = cardsData;
}

