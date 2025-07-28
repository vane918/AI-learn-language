import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

const LoadingOverlay = () => {
  return (
    <Backdrop
      sx={{
        position: 'absolute',
        zIndex: 9999,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      }}
      open={true}
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;