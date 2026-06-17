import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import SaveInstanceButton from '../../components/SaveInstanceButton.jsx';
import StandaloneHtmlFrame from '../../components/StandaloneHtmlFrame.jsx';

export default function GmBoardPage() {
  const location = useLocation();
  const iframeRef = useRef(null);
  const [instanceSaved, setInstanceSaved] = useState(false);
  const src = `${import.meta.env.BASE_URL}tools/gmboard.html${location.search}`;

  const postToFrame = useCallback((type) => {
    iframeRef.current?.contentWindow?.postMessage({ type }, window.location.origin);
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'gb:instance-state' || event.data?.kind !== 'gmboard') return;
      setInstanceSaved(Boolean(event.data.saved));
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <Box sx={gmBoardPageSx}>
      <AppTopBar>
        <SaveInstanceButton saved={instanceSaved} onClick={() => postToFrame('gb:save-instance')} />
      </AppTopBar>
      <StandaloneHtmlFrame
        title="GM Board"
        src={src}
        iframeRef={iframeRef}
        onLoad={() => postToFrame('gb:request-instance-state')}
        rootSx={gmBoardFrameSx}
      />
    </Box>
  );
}

const gmBoardPageSx = {
  minHeight: '100vh',
  bgcolor: '#0f0e0d',
  pt: APP_TOP_BAR_HEIGHT,
};

const gmBoardFrameSx = {
  height: `calc(100vh - ${APP_TOP_BAR_HEIGHT})`,
};
