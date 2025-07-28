import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  ButtonGroup,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import { VolumeUp, ArrowBack } from '@mui/icons-material';
import { useUIStore } from '../../stores/uiStore';
import { updateItemAfterReview } from '../../services/reviewEngine';
import { saveLearningItem } from '../../services/storageService';
import { LearningItem, ReviewResult } from '../../types';

const ReviewPage = () => {
  const { reviewQueue, setReviewQueue, setCurrentPage } = useUIStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  
  const queryClient = useQueryClient();

  // 更新学习项目的 mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ item, result }: { item: LearningItem; result: ReviewResult }) => {
      const updatedItem = updateItemAfterReview(item, result);
      await saveLearningItem(updatedItem);
      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningItems'] });
    },
  });

  const currentItem = reviewQueue[currentIndex];
  const progress = reviewQueue.length > 0 ? ((currentIndex + 1) / reviewQueue.length) * 100 : 0;

  const handleReviewResult = async (quality: ReviewResult['quality']) => {
    if (!currentItem) return;

    try {
      await updateItemMutation.mutateAsync({
        item: currentItem,
        result: { quality }
      });

      setReviewedCount(prev => prev + 1);

      // 移动到下一个项目
      if (currentIndex < reviewQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // 复习完成
        handleReviewComplete();
      }
    } catch (error) {
      console.error('Failed to update review result:', error);
    }
  };

  const handleReviewComplete = () => {
    setReviewQueue([]);
    setCurrentPage('home');
  };

  const handleSkip = () => {
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      handleReviewComplete();
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  if (reviewQueue.length === 0) {
    return (
      <Box p={2} textAlign="center">
        <Typography variant="h6" gutterBottom>
          🎉 No reviews pending!
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Great job! Come back tomorrow for more reviews.
        </Typography>
        <Button
          variant="contained"
          onClick={() => setCurrentPage('home')}
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Box>
    );
  }

  if (!currentItem) {
    return (
      <Box p={2} textAlign="center">
        <Typography variant="body1">Loading review...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <Box p={2} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <IconButton onClick={() => setCurrentPage('home')} size="small">
            <ArrowBack />
          </IconButton>
          <Typography variant="subtitle1">
            Review {currentIndex + 1} of {reviewQueue.length}
          </Typography>
          <Chip
            label={`${reviewedCount} done`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* 复习卡片 */}
      <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* 问题部分 */}
            <Box textAlign="center" mb={3}>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
                <Typography variant="h4" color="primary">
                  {currentItem.content}
                </Typography>
                <IconButton
                  onClick={() => speakText(currentItem.content)}
                  size="small"
                  color="primary"
                >
                  <VolumeUp />
                </IconButton>
              </Box>
              
              <Chip
                label={currentItem.type === 'word' ? 'Word' : 'Sentence'}
                size="small"
                variant="outlined"
              />
              
              {currentItem.context && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                  Context: "{currentItem.context}"
                </Typography>
              )}
            </Box>

            {/* 答案部分 */}
            {showAnswer ? (
              <Box textAlign="center" mb={3}>
                <Typography variant="h6" color="success.main" gutterBottom>
                  {currentItem.translation}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  How well did you remember this?
                </Typography>
              </Box>
            ) : (
              <Box textAlign="center" mb={3}>
                <Button
                  variant="outlined"
                  onClick={() => setShowAnswer(true)}
                  size="large"
                >
                  Show Answer
                </Button>
              </Box>
            )}
          </CardContent>

          {/* 操作按钮 */}
          <Box p={2} sx={{ borderTop: 1, borderColor: 'divider' }}>
            {showAnswer ? (
              <Box>
                <Typography variant="body2" textAlign="center" mb={2} color="text.secondary">
                  Rate your memory:
                </Typography>
                <ButtonGroup fullWidth variant="outlined" size="small">
                  <Button
                    onClick={() => handleReviewResult(0)}
                    color="error"
                    disabled={updateItemMutation.isPending}
                  >
                    Forgot
                  </Button>
                  <Button
                    onClick={() => handleReviewResult(2)}
                    color="warning"
                    disabled={updateItemMutation.isPending}
                  >
                    Hard
                  </Button>
                  <Button
                    onClick={() => handleReviewResult(4)}
                    color="success"
                    disabled={updateItemMutation.isPending}
                  >
                    Good
                  </Button>
                  <Button
                    onClick={() => handleReviewResult(5)}
                    color="primary"
                    disabled={updateItemMutation.isPending}
                  >
                    Easy
                  </Button>
                </ButtonGroup>
              </Box>
            ) : (
              <Button
                fullWidth
                variant="text"
                onClick={handleSkip}
                color="inherit"
              >
                Skip this word
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default ReviewPage;