/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ONES: string[] = [
  '', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस',
  'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस',
  'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाइस', 'उनतीस', 'तीस',
  'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस',
  'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास',
  'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ',
  'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सरसठ', 'अड़सठ', 'उनहत्तर', 'सत्तर',
  'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी', 'अस्सी',
  'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे',
  'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'
];

export function numberToHindiWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'शून्य रुपये मात्र';
  }

  const num = Math.floor(Math.abs(amount));

  function convertLessThousand(n: number): string {
    let result = '';
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundred > 0) {
      result += ONES[hundred] + ' सौ ';
    }
    if (remainder > 0) {
      result += ONES[remainder] + ' ';
    }
    return result.trim();
  }

  let words = '';
  let remaining = num;

  // Crores (करोड़)
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    words += convertLessThousand(crore) + ' करोड़ ';
  }

  // Lakhs (लाख)
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    words += convertLessThousand(lakh) + ' लाख ';
  }

  // Thousands (हज़ार)
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    words += convertLessThousand(thousand) + ' हज़ार ';
  }

  // Remaining < 1000
  if (remaining > 0) {
    words += convertLessThousand(remaining);
  }

  return words.trim() + ' रुपये मात्र';
}
