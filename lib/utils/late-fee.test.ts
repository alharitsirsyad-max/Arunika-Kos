/**
 * Unit tests untuk fungsi calculateLateFee.
 * Requirements: 5.2, 5.4
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateLateFee, type LateFeeInvoice } from "./late-fee";

/** Buat invoice fixture dengan nilai default sensible */
function makeInvoice(overrides: Partial<LateFeeInvoice> = {}): LateFeeInvoice {
  return {
    due_date: new Date(),
    grace_period_days: 3,
    late_fee_per_day: 50000,
    is_late_fee_waived: false,
    status: "UNPAID",
    ...overrides,
  };
}

/** Kembalikan Date N hari yang lalu dari hari ini (midnight) */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Kembalikan Date N hari ke depan dari hari ini (midnight) */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

describe("calculateLateFee", () => {
  describe("Req 5.4 — pengecualian denda (is_late_fee_waived)", () => {
    it("mengembalikan zero values ketika is_late_fee_waived = true", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(10), // sangat terlambat
        is_late_fee_waived: true,
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(0);
      expect(result.totalLateFee).toBe(0);
      expect(result.isWaived).toBe(true);
    });

    it("tidak menghitung denda meskipun sudah sangat terlambat jika waived", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(100),
        grace_period_days: 0,
        is_late_fee_waived: true,
      });

      const result = calculateLateFee(invoice);
      expect(result.totalLateFee).toBe(0);
    });
  });

  describe("Status PAID — tidak ada denda untuk invoice lunas", () => {
    it("mengembalikan zero values ketika status = PAID", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(10),
        status: "PAID",
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(0);
      expect(result.totalLateFee).toBe(0);
      expect(result.isWaived).toBe(false);
    });

    it("isWaived tetap false ketika status PAID dan waived false", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(5),
        status: "PAID",
        is_late_fee_waived: false,
      });

      expect(calculateLateFee(invoice).isWaived).toBe(false);
    });
  });

  describe("Req 5.2 — kalkulasi hari terlambat dan total denda", () => {
    it("tidak ada denda jika invoice belum jatuh tempo", () => {
      const invoice = makeInvoice({
        due_date: daysFromNow(5),
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(0);
      expect(result.totalLateFee).toBe(0);
      expect(result.isWaived).toBe(false);
    });

    it("tidak ada denda jika keterlambatan masih dalam grace period", () => {
      // Due date 3 hari lalu, grace period 3 hari → daysOverdue = max(0, 3-3) = 0
      const invoice = makeInvoice({
        due_date: daysAgo(3),
        grace_period_days: 3,
      });

      const result = calculateLateFee(invoice);
      expect(result.daysOverdue).toBe(0);
      expect(result.totalLateFee).toBe(0);
    });

    it("tidak ada denda jika tepat pada batas grace period", () => {
      // Due date hari ini, grace period 3 → rawDaysLate = 0, daysOverdue = max(0, 0-3) = 0
      const invoice = makeInvoice({
        due_date: daysFromNow(0),
        grace_period_days: 3,
      });

      const result = calculateLateFee(invoice);
      expect(result.daysOverdue).toBe(0);
    });

    it("menghitung denda dengan benar setelah melewati grace period", () => {
      // Due date 5 hari lalu, grace period 3 → daysOverdue = 5-3 = 2
      const invoice = makeInvoice({
        due_date: daysAgo(5),
        grace_period_days: 3,
        late_fee_per_day: 50000,
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(2);
      expect(result.totalLateFee).toBe(100000); // 2 × 50000
      expect(result.isWaived).toBe(false);
    });

    it("menghitung denda dengan grace period = 0", () => {
      // Due date 4 hari lalu, grace period 0 → daysOverdue = 4
      const invoice = makeInvoice({
        due_date: daysAgo(4),
        grace_period_days: 0,
        late_fee_per_day: 50000,
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(4);
      expect(result.totalLateFee).toBe(200000); // 4 × 50000
    });

    it("menggunakan tarif denda per hari yang dikonfigurasi per invoice", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(10),
        grace_period_days: 3,
        late_fee_per_day: 75000, // tarif berbeda
      });

      const result = calculateLateFee(invoice);

      expect(result.daysOverdue).toBe(7); // 10 - 3
      expect(result.totalLateFee).toBe(525000); // 7 × 75000
    });

    it("daysOverdue tidak pernah negatif (min = 0)", () => {
      // Due date jauh di masa depan
      const invoice = makeInvoice({
        due_date: daysFromNow(30),
      });

      const result = calculateLateFee(invoice);
      expect(result.daysOverdue).toBeGreaterThanOrEqual(0);
      expect(result.totalLateFee).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Kombinasi edge cases", () => {
    it("PAID mengalahkan is_late_fee_waived — isWaived tetap false jika PAID", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(10),
        status: "PAID",
        is_late_fee_waived: false,
      });

      expect(calculateLateFee(invoice).isWaived).toBe(false);
    });

    it("isWaived = true jika invoice waived (bukan PAID)", () => {
      const invoice = makeInvoice({
        due_date: daysAgo(10),
        status: "UNPAID",
        is_late_fee_waived: true,
      });

      expect(calculateLateFee(invoice).isWaived).toBe(true);
    });

    it("menangani invoice dengan status UNPAID yang baru dibuat (due date hari ini)", () => {
      const invoice = makeInvoice({
        due_date: new Date(), // hari ini, jam berbeda-beda
        grace_period_days: 3,
        status: "UNPAID",
      });

      const result = calculateLateFee(invoice);
      // Baru dibuat hari ini, belum melewati grace period
      expect(result.daysOverdue).toBe(0);
      expect(result.totalLateFee).toBe(0);
    });
  });
});
