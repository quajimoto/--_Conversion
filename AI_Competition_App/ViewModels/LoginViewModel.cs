using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using AI_Competition_App.Models;
using AI_Competition_App.Services;

namespace AI_Competition_App.ViewModels
{
    public class LoginViewModel : BaseViewModel
    {
        private readonly MainViewModel _mainViewModel;
        private readonly DatabaseService _dbService;

        public bool IsSimpleMode { get; set; }
        public bool IsSecureMode { get; set; }

        public ObservableCollection<UserModel> UserList { get; set; }
        public UserModel SelectedUser { get; set; }

        public string UserId { get; set; }
        // Password would be handled via a PasswordBox and passed directly or via a SecureString, 
        // for simplicity in this skeleton we omit strict password handling.

        public ICommand LoginCommand { get; }

        public LoginViewModel(MainViewModel mainViewModel)
        {
            _mainViewModel = mainViewModel;
            _dbService = new DatabaseService();

            string authType = _dbService.GetAuthType();
            if (authType == "SIMPLE")
            {
                IsSimpleMode = true;
                IsSecureMode = false;
                UserList = new ObservableCollection<UserModel>(_dbService.GetUsers());
                if (UserList.Any())
                {
                    SelectedUser = UserList.First();
                }
            }
            else
            {
                IsSimpleMode = false;
                IsSecureMode = true;
            }

            LoginCommand = new RelayCommand(ExecuteLogin);
        }

        private void ExecuteLogin(object obj)
        {
            if (IsSimpleMode)
            {
                if (SelectedUser != null)
                {
                    _mainViewModel.OnLoginSuccess(SelectedUser);
                }
                else
                {
                    MessageBox.Show("사용자를 선택해주세요.");
                }
            }
            else
            {
                // SECURE mode login logic
                var users = _dbService.GetUsers();
                var user = users.FirstOrDefault(u => u.UserId == UserId); // simplified password check
                if (user != null)
                {
                    _mainViewModel.OnLoginSuccess(user);
                }
                else
                {
                    MessageBox.Show("유효하지 않은 사번입니다.");
                }
            }
        }
    }
}
