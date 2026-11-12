// Sample snacks so the shop and the admin have something to show. Photos are added in the admin.
// Loaded by scripts/setup-db.mjs into an empty database only.
//
// Variants: [name, price, grams, stock, was price (promo only)]

const specs = (pairs) => Object.entries(pairs).map(([label, value]) => ({ label, value }));

export const DEMO_CATALOG = [
  ["Keripik & Kerupuk", [
    ["Keripik Pisang Lumer", "Pisang kepok tipis, renyah, dengan lapisan rasa yang lumer di mulut.",
      specs({ Asal: "Makassar", "Daya tahan": "3 bulan", Penyimpanan: "Tutup rapat, jauhkan dari matahari", Bahan: "Pisang kepok, minyak sawit, gula, cokelat", Kemasan: "Standing pouch" }),
      [["Original · 150 g", 15000, 170, 40], ["Cokelat · 150 g", 18000, 170, 30], ["Balado · 150 g", 17000, 170, 0]]],
    ["Keripik Singkong Balado", "Singkong iris tipis dengan bumbu balado pedas manis.",
      specs({ Asal: "Maros", "Daya tahan": "3 bulan", "Tingkat pedas": "Sedang", Bahan: "Singkong, cabai, bawang, gula" }),
      [["200 g", 14000, 220, 25], ["500 g", 32000, 530, 10, 36000]]],
    ["Kerupuk Ikan Tenggiri", "Kerupuk mentah dari ikan tenggiri asli, tinggal digoreng.",
      specs({ Asal: "Pangkep", "Daya tahan": "6 bulan (mentah)", "Cara masak": "Goreng di minyak panas", Bahan: "Ikan tenggiri, tepung tapioka" }),
      [["250 g", 22000, 270, 18]]],
  ]],
  ["Kue Kering", [
    ["Nastar Nanas", "Kue kering mentega dengan selai nanas buatan sendiri. Tahan 3 bulan di toples tertutup.",
      specs({ "Daya tahan": "3 bulan", Penyimpanan: "Toples tertutup rapat", Bahan: "Tepung, mentega, telur, selai nanas", Mengandung: "Telur, susu, gluten" }),
      [["Toples 250 g", 55000, 450, 12], ["Toples 500 g", 98000, 750, 6]]],
    ["Kastengel Keju", "Kue keju edam yang gurih dan renyah.",
      specs({ "Daya tahan": "2 bulan", Bahan: "Tepung, mentega, keju edam", Mengandung: "Susu, telur, gluten" }),
      [["Toples 250 g", 60000, 450, 3]]],
    ["Putri Salju", "Kue kacang mede bertabur gula halus.",
      specs({ "Daya tahan": "2 bulan", Mengandung: "Kacang mede, susu, gluten" }),
      [["Toples 250 g", 50000, 450, 9]]],
  ]],
  ["Kacang & Biji", [
    ["Kacang Disko", "Kacang tanah berbalut tepung renyah.",
      specs({ "Daya tahan": "4 bulan", Bahan: "Kacang tanah, tepung, bawang", Mengandung: "Kacang tanah, gluten" }),
      [["250 g", 20000, 270, 30], ["500 g", 37000, 530, 14]]],
    ["Kacang Mete Sangrai", "Mete utuh dari Sulawesi Tenggara, disangrai tanpa minyak.",
      specs({ Asal: "Buton, Sulawesi Tenggara", "Daya tahan": "6 bulan", Proses: "Sangrai tanpa minyak", Mengandung: "Kacang mede" }),
      [["250 g", 75000, 270, 8], ["500 g", 145000, 530, 4, 160000]]],
  ]],
  ["Cokelat & Permen", [
    ["Cokelat Batang Kopi Toraja", "Cokelat hitam 60% dengan bubuk kopi Toraja.",
      specs({ "Kadar kakao": "60%", "Daya tahan": "9 bulan", Penyimpanan: "Suhu di bawah 25°C", Mengandung: "Susu, kedelai" }),
      [["80 g", 25000, 100, 20]]],
    ["Permen Jahe", "Permen jahe merah, hangat di tenggorokan.",
      specs({ "Daya tahan": "12 bulan", Bahan: "Gula, jahe merah" }),
      [["100 g", 12000, 120, 50]]],
  ]],
  ["Oleh-oleh Makassar", [
    ["Bagea Kenari", "Kue sagu dengan kenari, keras di luar dan wangi.",
      specs({ Asal: "Makassar", "Daya tahan": "2 bulan", Bahan: "Sagu, kenari, gula, rempah" }),
      [["Isi 10", 30000, 300, 15]]],
    ["Baruasa", "Kue kering beras dan kelapa khas Bugis.",
      specs({ Asal: "Bone", "Daya tahan": "1 bulan", Bahan: "Tepung beras, kelapa, gula merah" }),
      [["250 g", 28000, 300, 2]]],
  ]],
  ["Minuman", [
    ["Sirup Markisa", "Sirup markisa kental khas Makassar. Campur 1 bagian sirup dengan 4 bagian air.",
      specs({ Asal: "Makassar", "Daya tahan": "12 bulan (belum dibuka)", Penyimpanan: "Kulkas setelah dibuka", Takaran: "1 bagian sirup, 4 bagian air" }),
      [["Botol 620 ml", 45000, 900, 10, 52000]]],
    ["Kopi Toraja Bubuk", "Arabika Toraja sangrai sedang, digiling untuk tubruk atau V60.",
      specs({ Asal: "Toraja", Jenis: "Arabika", Sangrai: "Medium", Gilingan: "Sedang (tubruk / V60)", "Daya tahan": "6 bulan" }),
      [["200 g", 55000, 220, 12]]],
  ]],
];

export const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
