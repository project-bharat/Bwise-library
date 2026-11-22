// Return one edition key for equivalent ISBN-10 and ISBN-13 inputs.
export function isbn13(input) {
  const digits = String(input ?? '').replace(/[\s-]/g, '').toUpperCase();
  const check13 = prefix => {
    const sum = [...prefix].reduce((n, digit, index) => n + Number(digit) * (index % 2 ? 3 : 1), 0);
    return String((10 - sum % 10) % 10);
  };
  if (/^\d{9}[\dX]$/.test(digits)) {
    const sum = [...digits].reduce((n, c, i) => n + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
    if (sum % 11) return '';
    const prefix = '978' + digits.slice(0, 9);
    return prefix + check13(prefix);
  }
  return /^(978|979)\d{10}$/.test(digits) && !digits.startsWith('9790') && check13(digits.slice(0, 12)) === digits[12] ? digits : '';
}
