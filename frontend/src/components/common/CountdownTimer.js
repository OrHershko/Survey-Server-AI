import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const CountdownTimer = ({ expiryDate }) => {
  const calculateTimeLeft = () => {
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
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  if (timeLeft.expired) {
    return <Typography variant="caption" color="error">Survey has expired.</Typography>;
  }

  return (
    <Typography variant="caption" color="text.secondary">
      Expires in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </Typography>
  );
};

export default CountdownTimer; 