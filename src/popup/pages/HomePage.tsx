import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  LinearProgress,
  Chip,
} from '@mui/material';
import { School, TrendingUp, Today, EmojiEvents } from '@mui/icons-material';
import { getLearningItems } from '../../services/storageService';
import { getTodayReviewItems, getReviewStats, calculateProgress, getStudyStreak } from '../../services/reviewEngine';
import { useUIStore } from '../../stores/uiStore';

const HomePage = () => {
  const { setCurrentPage, setReviewQueue } = useUIStore();

  // 获取学习数据
  const { data: learningItems = [], isLoading } = useQuery({
    queryKey: ['learningItems'],
    queryFn: getLearningItems,
  });

  const stats = getReviewStats(learningItems);
  const progress = calculateProgress(learningItems);
  const streak = getStudyStreak(learningItems);
  const todayReviewItems = getTodayReviewItems(learningItems);

  const handleStartReview = () => {
    setReviewQueue(todayReviewItems);
    setCurrentPage('review');
  };

  if (isLoading) {
    return (
      <Box p={2}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Loading your learning data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={2} sx={{ height: '100%', overflow: 'auto' }}>
      {/* 欢迎标题 */}
      <Box mb={3} textAlign="center">
        <Typography variant="h5" gutterBottom>
          📚 LexiMemo AI
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Smart language learning with AI
        </Typography>
      </Box>

      {/* 今日复习卡片 */}
      {stats.pendingReviews > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6">
                  {stats.pendingReviews} words to review
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Keep your learning streak going!
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleStartReview}
                startIcon={<School />}
              >
                Start Review
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Today color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6">{stats.todayReviews}</Typography>
              <Typography variant="caption" color="text.secondary">
                Today's Reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <EmojiEvents color="warning" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6">{streak}</Typography>
              <Typography variant="caption" color="text.secondary">
                Day Streak
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <School color="success" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6">{stats.totalItems}</Typography>
              <Typography variant="caption" color="text.secondary">
                Total Words
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUp color="info" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6">{progress}%</Typography>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 学习进度 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Learning Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {stats.totalItems > 0 
              ? `${Math.round((stats.totalItems - stats.pendingReviews) / stats.totalItems * 100)}% mastered`
              : 'Start learning by selecting text on any webpage!'
            }
          </Typography>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Quick Actions
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip
              label="View All Words"
              onClick={() => setCurrentPage('wordList')}
              clickable
              variant="outlined"
            />
            <Chip
              label="Settings"
              onClick={() => setCurrentPage('settings')}
              clickable
              variant="outlined"
            />
            {stats.upcomingReviews > 0 && (
              <Chip
                label={`${stats.upcomingReviews} tomorrow`}
                color="info"
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 使用提示 */}
      {stats.totalItems === 0 && (
        <Card sx={{ mt: 2, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              💡 How to get started:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              1. Visit any webpage<br />
              2. Select text you want to learn<br />
              3. Click "Save to Memory" in the translation card<br />
              4. Come back here to review!
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default HomePage;