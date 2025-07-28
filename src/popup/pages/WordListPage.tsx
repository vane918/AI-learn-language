import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Delete,
  VolumeUp,
  Search,
  FilterList,
} from '@mui/icons-material';
import { getLearningItems, deleteLearningItem } from '../../services/storageService';
import { LearningItem } from '../../types';

const WordListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'word' | 'sentence'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const queryClient = useQueryClient();

  // 获取学习项目
  const { data: learningItems = [], isLoading } = useQuery({
    queryKey: ['learningItems'],
    queryFn: getLearningItems,
  });

  // 删除项目的 mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLearningItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningItems'] });
    },
  });

  // 过滤和搜索
  const filteredItems = learningItems.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.translation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // 按创建时间排序（最新的在前）
  const sortedItems = filteredItems.sort((a, b) => b.createdAt - a.createdAt);

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(itemId);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getNextReviewText = (item: LearningItem) => {
    const now = Date.now();
    const nextReview = item.nextReviewAt;
    
    if (nextReview <= now) {
      return 'Ready to review';
    }
    
    const days = Math.ceil((nextReview - now) / (1000 * 60 * 60 * 24));
    return `Review in ${days} day${days > 1 ? 's' : ''}`;
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterSelect = (filter: 'all' | 'word' | 'sentence') => {
    setFilterType(filter);
    handleFilterClose();
  };

  if (isLoading) {
    return (
      <Box p={2}>
        <Typography>Loading your words...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部搜索和过滤 */}
      <Box p={2} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          My Words ({learningItems.length})
        </Typography>
        
        <Box display="flex" gap={1} mb={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search words or translations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <IconButton onClick={handleFilterClick}>
            <FilterList />
          </IconButton>
        </Box>

        <Box display="flex" gap={1}>
          <Chip
            label={`All (${learningItems.length})`}
            variant={filterType === 'all' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilterType('all')}
          />
          <Chip
            label={`Words (${learningItems.filter(i => i.type === 'word').length})`}
            variant={filterType === 'word' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilterType('word')}
          />
          <Chip
            label={`Sentences (${learningItems.filter(i => i.type === 'sentence').length})`}
            variant={filterType === 'sentence' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilterType('sentence')}
          />
        </Box>
      </Box>

      {/* 单词列表 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {sortedItems.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {searchTerm || filterType !== 'all' 
                ? 'No items match your search criteria'
                : 'No words saved yet'
              }
            </Typography>
            {!searchTerm && filterType === 'all' && (
              <Typography variant="body2" color="text.secondary">
                Start learning by selecting text on any webpage!
              </Typography>
            )}
          </Box>
        ) : (
          <List>
            {sortedItems.map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.50' }
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1" component="span">
                        {item.content}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => speakText(item.content)}
                      >
                        <VolumeUp fontSize="small" />
                      </IconButton>
                      <Chip
                        label={item.type}
                        size="small"
                        variant="outlined"
                        color={item.type === 'word' ? 'primary' : 'secondary'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary">
                        {item.translation}
                      </Typography>
                      {item.context && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Context: {item.context}
                        </Typography>
                      )}
                      <Box display="flex" justifyContent="space-between" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Added: {formatDate(item.createdAt)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color={item.nextReviewAt <= Date.now() ? 'warning.main' : 'text.secondary'}
                        >
                          {getNextReviewText(item)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteMutation.isPending}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* 过滤菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFilterClose}
      >
        <MenuItem onClick={() => handleFilterSelect('all')}>
          All Items
        </MenuItem>
        <MenuItem onClick={() => handleFilterSelect('word')}>
          Words Only
        </MenuItem>
        <MenuItem onClick={() => handleFilterSelect('sentence')}>
          Sentences Only
        </MenuItem>
      </Menu>

      {/* 统计信息 */}
      {learningItems.length > 0 && (
        <Card sx={{ m: 2, mt: 0 }}>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Total: {learningItems.length} items • 
              Ready to review: {learningItems.filter(i => i.nextReviewAt <= Date.now()).length}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default WordListPage;