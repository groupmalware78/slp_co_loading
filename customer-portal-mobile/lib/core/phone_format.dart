/// Mirrors customer-portal's src/lib/phoneFormat.ts — kept in sync by hand.
String formatPhoneInput(String value) {
  var digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('1')) digits = digits.substring(1);
  if (digits.length > 10) digits = digits.substring(0, 10);

  if (digits.isEmpty) return '';
  if (digits.length < 4) return '+1 ($digits';
  if (digits.length < 7) return '+1 (${digits.substring(0, 3)}) ${digits.substring(3)}';
  return '+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}';
}

final _phoneFormatRegex = RegExp(r'^\+1 \(\d{3}\) \d{3}-\d{4}$');

bool isValidFormattedPhone(String value) => _phoneFormatRegex.hasMatch(value);
