import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Home, School, Settings, List } from '@mui/icons-material';
import { useUIStore } from '../../stores/uiStore';

const Navigation = () => {
  const { currentPage, setCurrentPage } = useUIStore();

  const handleChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentPage(newValue as any);
  };

  return (
    <Paper sx={{ position: 'sticky', top: 0, zIndex: 1000 }} elevation={3}>
      <BottomNavigation
        value={currentPage}
        onChange={handleChange}
        sx={{ height: 56 }}
      >
        <BottomNavigationAction
          label="Home"
          value="home"
          icon={<Home />}
        />
        <BottomNavigationAction
          label="Review"
          value="review"
          icon={<School />}
        />
        <BottomNavigationAction
          label="Words"
          value="wordList"
          icon={<List />}
        />
        <BottomNavigationAction
          label="Settings"
          value="settings"
          icon={<Settings />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default Navigation;