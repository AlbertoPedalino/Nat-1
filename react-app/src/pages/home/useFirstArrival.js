import { useEffect, useState } from 'react';

// The home cover plays its entrance (the logo die's roll, the name's cheer)
// once per visit: arriving on the site plays it, coming back to the home page
// from elsewhere in the app finds the cover already at rest. Lives as long as
// the page does, so a reload is a new arrival.
let arrived = false;

// True on the first home page of the visit, false on every later one.
export function useFirstArrival() {
  const [first] = useState(() => !arrived);
  useEffect(() => { arrived = true; }, []);
  return first;
}
