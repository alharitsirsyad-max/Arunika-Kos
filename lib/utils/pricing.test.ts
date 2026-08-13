import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateTotalPrice, formatRoomPrice } from "./pricing";

// ─── Unit Tests ─────────────────────────────────────────────────────────────

describe("calculateTotalPrice", () => {
  it("menghitung total harga dengan benar untuk skenario umum", () => {
    // Rp3.900.000 × 1 periode = Rp3.900.000
    expect(calculateTotalPrice(3_900_000, 1)).toBe(3_900_000);
  });

  it("menghitung total harga untuk 3 periode", () => {
    // Rp3.900.000 × 3 periode = Rp11.700.000
    expect(calculateTotalPrice(3_900_000, 3)).toBe(11_700_000);
  });

  it("mengembalikan 0 jika harga 0", () => {
    expect(calculateTotalPrice(0, 5)).toBe(0);
  });

  it("mengembalikan 0 jika durationPeriods 0", () => {
    expect(calculateTotalPrice(3_900_000, 0)).toBe(0);
  });

  it("menghitung dengan benar untuk 1 periode tunggal", () => {
    expect(calculateTotalPrice(1_500_000, 1)).toBe(1_500_000);
  });

  it("menghitung dengan benar untuk 24 periode (maksimum)", () => {
    expect(calculateTotalPrice(1_000_000, 24)).toBe(24_000_000);
  });
});

describe("formatRoomPrice", () => {
  it("memformat harga Rp3.900.000 per 3 bulan dengan benar", () => {
    expect(formatRoomPrice(3_900_000, 3)).toBe("Rp3.900.000 / 3 bulan");
  });

  it("memformat harga Rp1.500.000 per 1 bulan dengan benar", () => {
    expect(formatRoomPrice(1_500_000, 1)).toBe("Rp1.500.000 / 1 bulan");
  });

  it("memformat harga tanpa ribuan dengan benar", () => {
    expect(formatRoomPrice(500_000, 2)).toBe("Rp500.000 / 2 bulan");
  });

  it("menggunakan titik sebagai pemisah ribuan (locale Indonesia)", () => {
    const result = formatRoomPrice(1_000_000, 1);
    expect(result).toBe("Rp1.000.000 / 1 bulan");
  });

  it("memformat harga besar dengan benar", () => {
    expect(formatRoomPrice(10_000_000, 6)).toBe("Rp10.000.000 / 6 bulan");
  });

  it("diawali dengan 'Rp' tanpa spasi", () => {
    const result = formatRoomPrice(3_900_000, 3);
    expect(result.startsWith("Rp")).toBe(true);
    expect(result.startsWith("Rp ")).toBe(false);
  });

  it("diakhiri dengan ' bulan'", () => {
    const result = formatRoomPrice(3_900_000, 3);
    expect(result.endsWith(" bulan")).toBe(true);
  });
});

// ─── Property-Based Tests ────────────────────────────────────────────────────
// Validates: Requirements 1.4, 1.8

describe("calculateTotalPrice — property tests", () => {
  /**
   * Validates: Requirements 1.4
   * Properti: total_price = price × duration_periods (komutatif terhadap perkalian biasa)
   */
  it("selalu menghasilkan price × durationPeriods", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 24 }),
        (price, durationPeriods) => {
          expect(calculateTotalPrice(price, durationPeriods)).toBe(
            price * durationPeriods
          );
        }
      )
    );
  });

  /**
   * Validates: Requirements 1.4
   * Properti: hasil selalu >= price untuk durationPeriods >= 1
   */
  it("total price >= price untuk durationPeriods >= 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 24 }),
        (price, durationPeriods) => {
          expect(calculateTotalPrice(price, durationPeriods)).toBeGreaterThanOrEqual(price);
        }
      )
    );
  });
});

describe("formatRoomPrice — property tests", () => {
  /**
   * Validates: Requirements 1.8
   * Properti: output selalu mengandung jumlah bulan yang diberikan diikuti " bulan"
   */
  it("selalu mengandung periodMonths yang benar diikuti ' bulan'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 24 }),
        (price, periodMonths) => {
          const result = formatRoomPrice(price, periodMonths);
          expect(result).toContain(`${periodMonths} bulan`);
        }
      )
    );
  });

  /**
   * Validates: Requirements 1.8
   * Properti: output selalu diawali dengan "Rp"
   */
  it("selalu diawali dengan 'Rp'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 24 }),
        (price, periodMonths) => {
          const result = formatRoomPrice(price, periodMonths);
          expect(result.startsWith("Rp")).toBe(true);
        }
      )
    );
  });

  /**
   * Validates: Requirements 1.8
   * Properti: output mengikuti pola "Rp... / N bulan"
   */
  it("selalu mengikuti pola 'Rp[angka] / [N] bulan'", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999_999 }),
        fc.integer({ min: 1, max: 24 }),
        (price, periodMonths) => {
          const result = formatRoomPrice(price, periodMonths);
          // Format: "Rp[angka dengan titik] / [N] bulan"
          expect(result).toMatch(/^Rp[\d.]+\s\/\s\d+\sbulan$/);
        }
      )
    );
  });
});
