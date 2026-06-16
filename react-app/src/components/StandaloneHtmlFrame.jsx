import { Box } from '@mui/material';

export default function StandaloneHtmlFrame({ title, src, iframeRef, onLoad }) {
  return (
    <Box sx={frameRootSx}>
      <Box
        component="iframe"
        ref={iframeRef}
        title={title}
        src={src}
        onLoad={onLoad}
        sx={frameSx}
        allow="storage-access"
      />
    </Box>
  );
}

const frameRootSx = {
  width: '100%',
  height: '100vh',
  overflow: 'hidden',
  bgcolor: '#0f0e0d',
};

const frameSx = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: 'none',
};
