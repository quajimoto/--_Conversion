using System.Windows.Input;
using AI_Competition_App.Models;

namespace AI_Competition_App.ViewModels
{
    public class MainViewModel : BaseViewModel
    {
        private object _currentView;
        public object CurrentView
        {
            get => _currentView;
            set { _currentView = value; OnPropertyChanged(); }
        }

        private bool _isAdminVisible;
        public bool IsAdminVisible
        {
            get => _isAdminVisible;
            set { _isAdminVisible = value; OnPropertyChanged(); }
        }
        
        private UserModel _currentUser;

        public ICommand ShowEvaluationCommand { get; }
        public ICommand ShowAdminCommand { get; }
        public ICommand LogoutCommand { get; }

        public MainViewModel()
        {
            // Start with Login
            CurrentView = new LoginViewModel(this);
            IsAdminVisible = false;

            ShowEvaluationCommand = new RelayCommand(o => {
                if (_currentUser != null) CurrentView = new EvaluationViewModel(_currentUser);
            });
            ShowAdminCommand = new RelayCommand(o => {
                if (_currentUser != null && _currentUser.Role == "ADMIN") CurrentView = new AdminViewModel();
            });
            LogoutCommand = new RelayCommand(o => {
                _currentUser = null;
                IsAdminVisible = false;
                CurrentView = new LoginViewModel(this);
            });
        }

        public void OnLoginSuccess(UserModel user)
        {
            _currentUser = user;
            if (user.Role == "ADMIN")
            {
                IsAdminVisible = true;
            }
            // Switch to evaluation view by default
            CurrentView = new EvaluationViewModel(user);
        }
    }
}
