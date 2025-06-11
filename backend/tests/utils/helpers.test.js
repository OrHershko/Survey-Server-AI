const { isDateInPast, formatReadableDate } = require('../../utils/helpers');

describe('Helpers Utility Functions', () => {
  
  describe('isDateInPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(isDateInPast(pastDate)).toBe(true);
    });

    it('should return true for past date strings', () => {
      const pastDateString = '2020-01-01';
      expect(isDateInPast(pastDateString)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // One year from now
      expect(isDateInPast(futureDate)).toBe(false);
    });

    it('should return false for future date strings', () => {
      const futureYear = new Date().getFullYear() + 1;
      const futureDateString = `${futureYear}-12-31`;
      expect(isDateInPast(futureDateString)).toBe(false);
    });

    it('should handle edge case of very recent dates', () => {
      const now = new Date();
      const oneSecondAgo = new Date(now.getTime() - 1000);
      expect(isDateInPast(oneSecondAgo)).toBe(true);
    });

    it('should handle current moment (very close to now)', () => {
      const almostNow = new Date(Date.now() - 10); // 10ms ago
      expect(isDateInPast(almostNow)).toBe(true);
    });
  });

  describe('formatReadableDate', () => {
    it('should format a Date object correctly', () => {
      const testDate = new Date('2023-06-15T14:30:45.123Z');
      const formatted = formatReadableDate(testDate);
      // Note: This will format in local timezone, so we check the pattern
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format a date string correctly', () => {
      const testDateString = '2023-12-25T09:15:30';
      const formatted = formatReadableDate(testDateString);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should pad single-digit values with zeros', () => {
      // Create a date with single digits for month, day, hour, minute, second
      const testDate = new Date('2023-01-05T03:07:09');
      const formatted = formatReadableDate(testDate);
      
      // Check that the format includes proper zero-padding
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      // Verify specific parts are zero-padded
      const parts = formatted.split(/[-\s:]/);
      expect(parts[1]).toBe('01'); // month
      expect(parts[2]).toBe('05'); // day
    });

    it('should handle New Year date correctly', () => {
      const newYearDate = new Date('2024-01-01T00:00:00');
      const formatted = formatReadableDate(newYearDate);
      expect(formatted).toMatch(/^2024-01-01 \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle leap year date correctly', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00');
      const formatted = formatReadableDate(leapYearDate);
      expect(formatted).toMatch(/^2024-02-29 \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle end of year date correctly', () => {
      const endYearDate = new Date('2023-12-31T23:59:59');
      const formatted = formatReadableDate(endYearDate);
      expect(formatted).toMatch(/^2023-12-31 \d{2}:\d{2}:\d{2}$/);
    });
  });
}); 