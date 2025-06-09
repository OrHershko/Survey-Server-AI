import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const CountdownTimer = ({ expiryDate, closed }) => {
  const calculateTimeLeft = () => {
    // If no expiry date or survey is closed, return null
    if (expiryDate === null || closed) {
      return null;
    }

    const now = dayjs();
    const expiry = dayjs(expiryDate);
    const diff = expiry.diff(now);

    if (diff <= 0) {
      return { expired: true };
    }

    const d = dayjs.duration(diff);

    return {
      days: d.days(),
      hours: d.hours(),
      minutes: d.minutes(),
      seconds: d.seconds(),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    // Don't set up timer if survey is closed or has no expiry date
    if (expiryDate === null || closed) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryDate, closed]);

  // If expiryDate is null or survey is closed, show Done
  if (expiryDate === null || closed) {
    return <Typography variant="caption" color="error">Done</Typography>;
  }

  if (timeLeft?.expired) {
    return <Typography variant="caption" color="error">Survey has expired.</Typography>;
  }

  if (!timeLeft) {
    return <Typography variant="caption" color="error">Done</Typography>;
  }

  return (
    <Typography variant="caption" color="text.secondary">
      Expires in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </Typography>
  );
};

export default CountdownTimer; 