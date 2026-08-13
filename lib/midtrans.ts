import midtransClient from "midtrans-client";

// Snap client untuk membuat transaction token
export const snap = new midtransClient.Snap({
  isProduction: false, // Ganti ke true saat deploy ke production
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

// Core API client untuk verifikasi transaksi (opsional, untuk manual check status)
export const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});
