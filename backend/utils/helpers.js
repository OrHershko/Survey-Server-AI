/**
 * Checks if a given date is in the past.
 * @param {Date|string} date - The date to check (can be a Date object or a string parsable by Date).
 * @returns {boolean} True if the date is in the past, false otherwise.
 */
const isDateInPast = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  return targetDate < now;
};

/**
 * Formats a date to a more readable string (e.g., YYYY-MM-DD HH:mm:ss).
 * @param {Date|string} date - The date to format.
 * @returns {string} The formatted date string.
 */
const formatReadableDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Add other general utility functions here as needed.

module.exports = {
  isDateInPast,
  formatReadableDate,
}; 