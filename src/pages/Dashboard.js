import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { TextField } from '@mui/material';
import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Helmet } from 'react-helmet-async';
import CircularProgress from '@mui/material/CircularProgress'; // Import the CircularProgress component

import DashboardHeader from '../components/DashboardHeader';
import BubbleMap from '../components/charts/BubbleMap';
import Spacer from '../components/Spacer';

import './Dashboard.css';

const SEVER_URL = process.env.REACT_APP_SEVER_URL;

const Dashboard = () => {
  const theme = useTheme();
  const [seedWalletAddress, setSeedWalletAddress] = useState('');
  const [seedWalletData, setSeedWalletData] = useState(null);
  const [loading, setLoading] = useState(false); // New state for loading

  const fetchWalletData = async () => {
    setLoading(true); // Set loading to true when fetching data
    try {
      // const response = await axios.get(`http://localhost:5000/api/wallet/${seedWalletAddress}`);
      const response = await axios.get(`${SEVER_URL}/api/wallet/${seedWalletAddress}`)
      setSeedWalletData(response.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      alert('Failed to fetch wallet data. Please try again.');
    } finally {
      setLoading(false); // Set loading to false once fetching is complete
    }
  };

  const handleFindWallet = () => {
    if (!seedWalletAddress.trim()) {
      alert('Please enter a valid wallet address.');
      return;
    }
    fetchWalletData(); // Fetch wallet data when button is clicked
  };

  return (
    <>
      <Helmet>
        <title>Pawd Dashboard</title>
      </Helmet>
      <Box
        sx={{
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
          paddingY: 8,
        }}
      >
        <Container maxWidth="lg">
          {/* Header Section */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <DashboardHeader />
            </Grid>

            {/* Dashboard Title */}
            <Grid item xs={12}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: theme.palette.text.primary,
                  textAlign: 'center',
                }}
              >
                Welcome to Pawd Dashboard
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  color: theme.palette.text.secondary,
                  textAlign: 'center',
                  marginTop: 1,
                }}
              >
                Monitor and explore whale wallet data visually
              </Typography>
            </Grid>

            {/* Input Field Section */}
            <Grid item xs={12}>
              <Card
                elevation={3}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 3,
                  padding: 3,
                  textAlign: 'center',
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', marginBottom: 2 }}
                  >
                    Enter Wallet Address
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: 2,
                      marginBottom: 2,
                    }}
                  >
                    <TextField
                      label="Seed Wallet Address"
                      variant="outlined"
                      fullWidth
                      sx={{ maxWidth: '500px' }}
                      value={seedWalletAddress}
                      onChange={(e) => setSeedWalletAddress(e.target.value)}
                      disabled={loading} // Disable input while loading
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleFindWallet}
                      disabled={loading} // Disable button while loading
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Find Wallet'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Main Content Section */}
            <Grid item xs={12}>
              <Card
                elevation={3}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 3,
                  padding: 3,
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', marginBottom: 2 }}
                  >
                    Wallet Data Visualization
                  </Typography>
                  {loading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '65vh',
                        background: '#05579f',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        padding: '16px',
                        position: 'relative',
                      }}
                    >
                      <Box className="loading-container">
                        <Box className="loading-dots">
                          <Box className="dot dot1" />
                          <Box className="dot dot2" />
                          <Box className="dot dot3" />
                        </Box>
                      </Box>
                    </Box>
                  ) : seedWalletData ? (
                    <BubbleMap rawData={seedWalletData} />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '65vh',
                        background: '#05579f',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        padding: '16px',
                        position: 'relative',
                      }}
                    ></Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Spacer sx={{ paddingTop: 7 }} />
    </>
  );
};

export default Dashboard;
