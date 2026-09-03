# AI 경진대회 평가 시스템 - WPF C# 뼈대 코드 (MVVM 패턴)

본 문서는 프론트엔드(WPF) 개발 착수를 위한 핵심 View와 ViewModel의 구조를 담고 있습니다.

## 1. 프로젝트 폴더 구조
```text
📁 AI_Competition_App
 ┣ 📁 Models
 ┃ ┗ 📄 UserModel.cs, EvaluationModel.cs
 ┣ 📁 ViewModels
 ┃ ┣ 📄 MainViewModel.cs (라우팅 및 권한 관리)
 ┃ ┣ 📄 LoginViewModel.cs (동적 로그인 처리)
 ┃ ┗ 📄 EvaluationViewModel.cs (평가 폼 동적 바인딩 및 제출 로직)
 ┣ 📁 Views
 ┃ ┣ 📄 MainView.xaml (파스텔 톤 테마 적용)
 ┃ ┣ 📄 LoginView.xaml
 ┃ ┗ 📄 EvaluationView.xaml
 ┗ 📄 App.xaml (시작점)
```

## 2. MainViewModel.cs (권한 라우팅 및 뷰 전환)
```csharp
using System.Windows.Input;

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

    public MainViewModel()
    {
        // 앱 시작 시 로그인 화면 노출
        CurrentView = new LoginViewModel(this);
        IsAdminVisible = false; // 기본적으로 관리자 메뉴 숨김
    }

    // 로그인 성공 시 호출되는 콜백 메서드
    public void OnLoginSuccess(UserModel user)
    {
        if(user.Role == "ADMIN")
        {
            IsAdminVisible = true;
        }
        // 평가 화면으로 전환
        CurrentView = new EvaluationViewModel(user);
    }
}
```

## 3. LoginView.xaml (동적 렌더링 UI)
```xml
<UserControl x:Class="AI_Competition.Views.LoginView"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Grid>
        <!-- SIMPLE 모드: 이름 선택 콤보박스 -->
        <StackPanel Visibility="{Binding IsSimpleMode, Converter={StaticResource BooleanToVisibilityConverter}}">
            <TextBlock Text="평가자 이름 선택" />
            <ComboBox ItemsSource="{Binding UserList}" SelectedItem="{Binding SelectedUser}" />
            <Button Command="{Binding LoginCommand}" Content="입장하기" />
        </StackPanel>

        <!-- SECURE 모드: 사번 및 패스워드 입력 -->
        <StackPanel Visibility="{Binding IsSecureMode, Converter={StaticResource BooleanToVisibilityConverter}}">
            <TextBlock Text="사번" />
            <TextBox Text="{Binding UserId}" />
            <TextBlock Text="비밀번호" />
            <PasswordBox x:Name="PwBox" />
            <Button Command="{Binding LoginCommand}" Content="로그인" />
        </StackPanel>
    </Grid>
</UserControl>
```

## 4. EvaluationViewModel.cs (동적 만점 기준 검증)
```csharp
public class EvaluationViewModel : BaseViewModel
{
    public int MaxPracticalScore { get; set; } // DB에서 로드된 만점 기준
    
    private int _inputPracticalScore;
    public int InputPracticalScore
    {
        get => _inputPracticalScore;
        set 
        { 
            if (value > MaxPracticalScore)
            {
                // WPF MessageBox 또는 Error 팝업 호출 (만점 초과 차단)
                System.Windows.MessageBox.Show($"실무적용 항목의 최대 점수는 {MaxPracticalScore}점입니다.");
                return; 
            }
            _inputPracticalScore = value; 
            OnPropertyChanged();
            UpdateTotalScore(); // 총점 재계산
        }
    }
    
    private bool _isReadOnly;
    public bool IsReadOnly
    {
        get => _isReadOnly; // SUBMITTED 상태일 경우 true로 설정하여 UI 잠금
        set { _isReadOnly = value; OnPropertyChanged(); }
    }

    // 제출 버튼 커맨드
    public ICommand SubmitCommand => new RelayCommand(ExecuteSubmit);
    private void ExecuteSubmit(object obj)
    {
        // DB Update: submit_status = 'SUBMITTED'
        // 이후 UI 잠금 처리
        IsReadOnly = true;
        System.Windows.MessageBox.Show("최종 제출이 완료되어 수정할 수 없습니다.");
    }
}
```
