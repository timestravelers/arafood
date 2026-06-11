import { kv } from '@vercel/kv';
import { createHmac } from 'crypto';

// ============ KONFIGURASI ============
const ADMIN_USER = 'arafood';
const ADMIN_PASS = 'arafood2026'; // ⚠️ GANTI PASSWORD INI!
const JWT_SECRET = process.env.JWT_SECRET || 'arafood-secret-key-ganti-ini-2026';
const KV_KEY = 'arafood_data';
// ======================================

// ============ DATA DEFAULT ============
const DEFAULT_DATA = {
  toko: {
    nama: "Ara Food",
    wa: "628386075575",
    alamat: "Jl. Fatahillah Link. Sukasari II Rt. 002/001 No. 50 Randakari Ciwandan Cilegon",
    email: "pesan.arafood@gmail.com",
    jam: "08:00 - 21:00 WIB",
    fb: "https://facebook.com/arafood",
    ig: "https://instagram.com/arafood",
    tt: "https://tiktok.com/@arafood",
    tentang: "Risol Mayo kami dibuat dengan resep turun-temurun yang telah disempurnakan. Menggunakan bahan-bahan pilihan terbaik, mayones premium, dan diolah oleh tangan-tangan terampil untuk menghasilkan risol dengan cita rasa yang tak terlupakan.",
    footerAbout: "Camilan risol mayo premium homemade dengan cita rasa creamy yang tak terlupakan. Dibuat fresh setiap hari untuk Anda.",
    stat1: "500+", stat2: "4.9★", stat3: "100%"
  },
  produk: [
    { nama: "Risol Mayo Original & Pedas", harga: 2500, hargaCoret: 5000, satuan: "pcs", badge: "Best Seller", desk: "Kulit risol renyah dengan isian mayo creamy dan sensasi pedas yang pas.", img: "https://image.idntimes.com/post/20220727/tips-membuat-risol-mayo-resep-risol-mayo-cara-membuat-kulit-risol-tips-mayonais-tidak-hilang-tips-mayonais-lumer-risol-mayo-simpel-9cde86371d7fc78c91ae80a6ffab250e-f6ce8413b01479537d09f73df91c3703.jpg" },
    { nama: "Risol Ayam Suwir", harga: 2500, hargaCoret: 5000, satuan: "pcs", badge: "", desk: "Kulit risol renyah dengan isian ayam suwir berbumbu gurih yang lezat.", img: "" },
    { nama: "Risol Cokelat", harga: 3500, hargaCoret: 6000, satuan: "pcs", badge: "Promo 10K dapat 3", desk: "Kulit risol renyah dengan isian cokelat lumer yang manis.", img: "" },
    { nama: "Risol Matcha", harga: 3500, hargaCoret: 6000, satuan: "pcs", badge: "Promo 10K dapat 3", desk: "Kulit risol renyah dengan isian matcha creamy beraroma khas.", img: "" }
  ],
  testimoni: [
    { nama: "Siti Nurhaliza", rating: 5, pesan: "Risol mayo terenak! Mayonesnya creamy banget." },
    { nama: "Budi Santoso", rating: 5, pesan: "Pelayanan cepat, rasa mantap. Recommended!" },
    { nama: "Dewi Lestari", rating: 5, pesan: "Order untuk acara kantor, semua tamu suka." },
    { nama: "Ahmad Rizky", rating: 4, pesan: "Risol mayo spicy-nya nampol! Top deh!" }
  ],
  faq: [
    { q: "Apakah risol mayo ini halal?", a: "Ya, 100% halal dan tersertifikasi." },
    { q: "Berapa lama ketahanan risol?", a: "Tahan 8 jam di suhu ruang, 2 hari di kulkas." },
    { q: "Apakah bisa delivery?", a: "Ya, kami melayani delivery area Cilegon dan sekitarnya." },
    { q: "Bagaimana cara pemesanan?", a: "Klik tombol WhatsApp pada produk yang diinginkan." },
    { q: "Apakah bisa untuk acara/reseller?", a: "Tentu! Hubungi admin untuk paket khusus." }
  ]
};

// ============ AUTH TOKEN (HMAC) ============
function generateToken(username) {
  const payload = { u: username, t: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  try {
    if (!token) return false;
    const [data, sig] = token.split('.');
    const expectedSig = createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    if (sig !== expectedSig) return false;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    // Token valid 24 jam
    if (Date.now() - payload.t > 24 * 60 * 60 * 1000) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.replace('Bearer ', '');
}

// ============ MAIN HANDLER ============
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const action = req.query.action || req.body?.action;
  
  try {
    switch (action) {
      
      // ====== READ DATA (Public) ======
      case 'read': {
        let data = await kv.get(KV_KEY);
        if (!data) {
          await kv.set(KV_KEY, DEFAULT_DATA);
          data = DEFAULT_DATA;
        }
        return res.json({ success: true, data });
      }
      
      // ====== LOGIN ======
      case 'login': {
        const { username, password } = req.body || {};
        if (username === ADMIN_USER && password === ADMIN_PASS) {
          const token = generateToken(username);
          return res.json({ success: true, token, message: 'Login berhasil' });
        }
        return res.status(401).json({ success: false, message: 'Username/password salah' });
      }
      
      // ====== CHECK LOGIN ======
      case 'check': {
        const token = getToken(req);
        return res.json({ loggedIn: verifyToken(token) });
      }
      
      // ====== SAVE DATA (Admin only) ======
      case 'save': {
        const token = getToken(req);
        if (!verifyToken(token)) {
          return res.status(401).json({ success: false, message: 'Sesi expired, silakan login ulang' });
        }
        const newData = req.body?.data;
        if (!newData) {
          return res.status(400).json({ success: false, message: 'Data tidak valid' });
        }
        await kv.set(KV_KEY, newData);
        return res.json({ success: true, message: 'Data berhasil disimpan' });
      }
      
      // ====== UPLOAD GAMBAR (Base64) ======
      case 'upload': {
        const token = getToken(req);
        if (!verifyToken(token)) {
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // Client kirim base64 langsung di body
        const { base64, filename } = req.body || {};
        if (!base64) {
          return res.status(400).json({ success: false, message: 'Tidak ada gambar' });
        }
        // Simpan sebagai data URL (base64 sudah include prefix)
        return res.json({ success: true, url: base64 });
      }
      
      // ====== LOGOUT ======
      case 'logout': {
        return res.json({ success: true });
      }
      
      default:
        return res.status(404).json({ success: false, message: 'Action tidak ditemukan' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}