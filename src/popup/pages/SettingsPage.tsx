import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Card,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { getUserSettings, saveUserSettings } from '../../services/storageService';
import { UserSettings } from '../../types';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  
  const queryClient = useQueryClient();

  // 获取用户设置
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
  });

  // 保存设置的 mutation
  const saveSettingsMutation = useMutation({
    mutationFn: saveUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });

  // 验证 API Key
  const validateApiKey = async () => {
    if (!apiKey.trim() || !settings?.aiProvider) return;
    
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'validateApiKey',
        data: {
          provider: settings.aiProvider,
          apiKey: apiKey.trim()
        }
      });
      
      if (response.success && response.data.valid) {
        setValidationResult({ valid: true, message: 'API Key is valid!' });
        // 自动保存有效的 API Key
        await saveSettingsMutation.mutateAsync({ apiKey: apiKey.trim() });
      } else {
        const errorMessage = response.data?.error || 'Invalid API Key. Please check and try again.';
        setValidationResult({ valid: false, message: errorMessage });
      }
    } catch (error) {
      console.error('API Key validation error:', error);
      setValidationResult({ valid: false, message: 'Failed to validate API Key.' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<UserSettings>) => {
    await saveSettingsMutation.mutateAsync(newSettings);
  };

  if (isLoading || !settings) {
    return (
      <Box p={2} textAlign="center">
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        ⚙️ Settings
      </Typography>

      {/* AI 提供商设置 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            AI Provider
          </Typography>
          
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={settings.aiProvider}
              label="AI Provider"
              onChange={(e) => handleSaveSettings({ aiProvider: e.target.value as any })}
            >
              <MenuItem value="openai">OpenAI (GPT)</MenuItem>
              <MenuItem value="deepseek">DeepSeek</MenuItem>
              <MenuItem value="gemini">Google Gemini</MenuItem>
              <MenuItem value="qwen">Qwen (通义千问)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="API Key"
            type="password"
            value={apiKey || settings.apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: settings.apiKey && (
                <Chip
                  label="Saved"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )
            }}
          />

          <Box display="flex" gap={1} mb={2}>
            <Button
              variant="outlined"
              onClick={validateApiKey}
              disabled={!apiKey.trim() || isValidating}
              startIcon={isValidating ? <CircularProgress size={16} /> : <CheckCircle />}
              size="small"
            >
              {isValidating ? 'Validating...' : 'Validate & Save'}
            </Button>
          </Box>

          {validationResult && (
            <Alert
              severity={validationResult.valid ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              {validationResult.message}
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary">
            Your API key is stored locally and never shared. Get your API key from:
            <br />
            • OpenAI: platform.openai.com
            <br />
            • DeepSeek: platform.deepseek.com
            <br />
            • Gemini: makersuite.google.com
            <br />
            • Qwen: dashscope.console.aliyun.com
          </Typography>
        </CardContent>
      </Card>

      {/* 学习设置 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Learning Preferences
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Target Language</InputLabel>
            <Select
              value={settings.language}
              label="Target Language"
              onChange={(e) => handleSaveSettings({ language: e.target.value as any })}
            >
              <MenuItem value="zh">Chinese (中文)</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            label="Daily Review Limit"
            type="number"
            value={settings.dailyReviewLimit}
            onChange={(e) => handleSaveSettings({ dailyReviewLimit: parseInt(e.target.value) || 50 })}
            inputProps={{ min: 1, max: 200 }}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableNotifications}
                onChange={(e) => handleSaveSettings({ enableNotifications: e.target.checked })}
              />
            }
            label="Enable daily review notifications"
          />
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Data Management
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your learning data is stored locally in your browser. Firebase sync will be available in a future update.
          </Typography>

          <Box display="flex" gap={1} mt={2}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // TODO: 实现数据导出功能
                alert('Export feature coming soon!');
              }}
            >
              Export Data
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                  // TODO: 实现数据清除功能
                  alert('Clear data feature coming soon!');
                }
              }}
            >
              Clear All Data
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            About LexiMemo AI
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Version 1.0.0
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            An AI-powered language learning extension with spaced repetition based on the Ebbinghaus forgetting curve.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="caption" color="text.secondary">
            Built with React, TypeScript, and Material-UI
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;