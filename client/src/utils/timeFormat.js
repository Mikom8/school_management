// Convert 24-hour time format to 12-hour format
export const formatTimeTo12Hour = (time24) => {
  if (!time24) return '';
  
  // Handle time ranges like "09:00 - 11:00"
  if (time24.includes(' - ')) {
    const [startTime, endTime] = time24.split(' - ');
    return `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`;
  }
  
  // Parse the time
  const [hours, minutes] = time24.split(':').map(Number);
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};
