using System;
using System.Windows;
using System.Windows.Input;
using System.Collections.ObjectModel;
using System.Linq;
using AI_Competition_App.Models;
using AI_Competition_App.Services;

namespace AI_Competition_App.ViewModels
{
    public class EvaluationViewModel : BaseViewModel
    {
        private readonly DatabaseService _dbService;
        private readonly UserModel _user;
        private EvaluationMasterModel _masterData;
        private List<string> _originalOrder;

        public int MaxPracticalScore { get; set; }
        public int MaxEfficiencyScore { get; set; }
        public int MaxInnovationScore { get; set; }
        public int MaxScalabilityScore { get; set; }

        private int _inputPracticalScore;
        public int InputPracticalScore
        {
            get => _inputPracticalScore;
            set
            {
                if (value > MaxPracticalScore)
                {
                    MessageBox.Show($"실무적용 배점의 최대 점수는 {MaxPracticalScore}점입니다.");
                    return;
                }
                _inputPracticalScore = value;
                OnPropertyChanged();
                UpdateTotalScore();
            }
        }

        private int _inputEfficiencyScore;
        public int InputEfficiencyScore
        {
            get => _inputEfficiencyScore;
            set
            {
                if (value > MaxEfficiencyScore)
                {
                    MessageBox.Show($"업무효율 배점의 최대 점수는 {MaxEfficiencyScore}점입니다.");
                    return;
                }
                _inputEfficiencyScore = value;
                OnPropertyChanged();
                UpdateTotalScore();
            }
        }

        private int _inputInnovationScore;
        public int InputInnovationScore
        {
            get => _inputInnovationScore;
            set
            {
                if (value > MaxInnovationScore)
                {
                    MessageBox.Show($"창의및혁신성 배점의 최대 점수는 {MaxInnovationScore}점입니다.");
                    return;
                }
                _inputInnovationScore = value;
                OnPropertyChanged();
                UpdateTotalScore();
            }
        }

        private int _inputScalabilityScore;
        public int InputScalabilityScore
        {
            get => _inputScalabilityScore;
            set
            {
                if (value > MaxScalabilityScore)
                {
                    MessageBox.Show($"확산 가능성 배점의 최대 점수는 {MaxScalabilityScore}점입니다.");
                    return;
                }
                _inputScalabilityScore = value;
                OnPropertyChanged();
                UpdateTotalScore();
            }
        }

        private int _totalScore;
        public int TotalScore
        {
            get => _totalScore;
            set { _totalScore = value; OnPropertyChanged(); }
        }

        private string _selectedDepartment;
        public string SelectedDepartment
        {
            get => _selectedDepartment;
            set
            {
                if (_selectedDepartment != value)
                {
                    _selectedDepartment = value;
                    OnPropertyChanged();
                    LoadEvaluationDataForSelectedDepartment();
                    OnPropertyChanged(nameof(IsLastDepartment));
                    OnPropertyChanged(nameof(IsNotLastDepartment));
                    CommandManager.InvalidateRequerySuggested();
                }
            }
        }

        public ObservableCollection<string> Departments { get; } = new ObservableCollection<string>();
        public ObservableCollection<EvaluationRecordModel> EvaluatedHistory { get; } = new ObservableCollection<EvaluationRecordModel>();

        private void LoadEvaluationHistory()
        {
            int masterId = _masterData?.MasterId ?? 1;
            var records = _dbService.GetEvaluationsForUser(masterId, _user.UserId);
            
            EvaluatedHistory.Clear();
            foreach (var r in records.Where(x => x.DepartmentName != SelectedDepartment).OrderBy(x => _originalOrder?.IndexOf(x.DepartmentName) ?? 0))
            {
                EvaluatedHistory.Add(r);
            }
        }

        private bool _isReadOnly;
        public bool IsReadOnly
        {
            get => _isReadOnly;
            set { _isReadOnly = value; OnPropertyChanged(); OnPropertyChanged(nameof(IsNotReadOnly)); }
        }

        public bool IsNotReadOnly => !IsReadOnly;

        public bool IsLastDepartment => _originalOrder != null && _originalOrder.Count > 0 && SelectedDepartment == _originalOrder.LastOrDefault();
        public bool IsNotLastDepartment => !IsLastDepartment;

        public ICommand SaveTempCommand { get; }
        public ICommand NextCommand { get; }
        public ICommand SubmitCommand { get; }

        public EvaluationViewModel(UserModel user)
        {
            _user = user;
            _dbService = new DatabaseService();

            _originalOrder = _dbService.GetDepartmentOrder();
            Departments.Clear();
            foreach (var dept in _originalOrder)
            {
                Departments.Add(dept);
            }

            LoadMasterData();

            SaveTempCommand = new RelayCommand(ExecuteSaveTemp);
            NextCommand = new RelayCommand(ExecuteNext, CanExecuteNext);
            SubmitCommand = new RelayCommand(ExecuteSubmit, CanExecuteSubmit);

            SelectedDepartment = Departments.FirstOrDefault() ?? "";
        }

        private void LoadMasterData()
        {
            _masterData = _dbService.GetActiveCompetitionMaster();
            if (_masterData != null)
            {
                MaxPracticalScore = _masterData.MaxPractical;
                MaxEfficiencyScore = _masterData.MaxEfficiency;
                MaxInnovationScore = _masterData.MaxInnovation;
                MaxScalabilityScore = _masterData.MaxScalability;
            }
        }

        private void LoadEvaluationDataForSelectedDepartment()
        {
            if (string.IsNullOrEmpty(SelectedDepartment)) return;

            int masterId = _masterData?.MasterId ?? 1;
            var records = _dbService.GetEvaluationsForUser(masterId, _user.UserId);
            var deptRecord = records.FirstOrDefault(r => r.DepartmentName == SelectedDepartment);

            if (deptRecord != null)
            {
                InputPracticalScore = deptRecord.ScorePractical;
                InputEfficiencyScore = deptRecord.ScoreEfficiency;
                InputInnovationScore = deptRecord.ScoreInnovation;
                InputScalabilityScore = deptRecord.ScoreScalability;
                
                // If the user has already submitted globally, set ReadOnly
                if (records.Any(r => r.SubmitStatus == "SUBMITTED"))
                {
                    IsReadOnly = true;
                }
            }
            else
            {
                InputPracticalScore = 0;
                InputEfficiencyScore = 0;
                InputInnovationScore = 0;
                InputScalabilityScore = 0;
            }

            LoadEvaluationHistory();
        }

        private void UpdateTotalScore()
        {
            TotalScore = InputPracticalScore + InputEfficiencyScore + InputInnovationScore + InputScalabilityScore;
        }

        private void SaveCurrentEvaluation(string status)
        {
            if (string.IsNullOrEmpty(SelectedDepartment)) return;

            var record = new EvaluationRecordModel
            {
                MasterId = _masterData?.MasterId ?? 1,
                DepartmentName = SelectedDepartment,
                EvaluatorId = _user.UserId,
                ScorePractical = InputPracticalScore,
                ScoreEfficiency = InputEfficiencyScore,
                ScoreInnovation = InputInnovationScore,
                ScoreScalability = InputScalabilityScore,
                SubmitStatus = status
            };

            _dbService.SaveEvaluation(record);
        }

        private void ExecuteSaveTemp(object obj)
        {
            try
            {
                SaveCurrentEvaluation("TEMP");
                MessageBox.Show("임시 저장이 완료되었습니다.", "알림", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"저장 실패: {ex.Message}", "오류", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private bool CanExecuteNext(object obj)
        {
            return !IsLastDepartment && !IsReadOnly;
        }

        private void ExecuteNext(object obj)
        {
            try
            {
                // Save current department first without showing popup
                SaveCurrentEvaluation("TEMP");

                // Get next department from the original sequence
                int originalIndex = _originalOrder.IndexOf(SelectedDepartment);
                if (originalIndex >= 0 && originalIndex < _originalOrder.Count - 1)
                {
                    string nextDept = _originalOrder[originalIndex + 1];

                    // Move the next department to the top of the observable collection
                    Departments.Remove(nextDept);
                    Departments.Insert(0, nextDept);

                    SelectedDepartment = nextDept;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"저장 실패: {ex.Message}", "오류", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private bool CanExecuteSubmit(object obj)
        {
            return IsLastDepartment && !IsReadOnly;
        }

        private void ExecuteSubmit(object obj)
        {
            if (string.IsNullOrEmpty(SelectedDepartment))
            {
                MessageBox.Show("부서를 선택해주세요.");
                return;
            }

            var result = MessageBox.Show("제출 후에는 수정이 불가합니다. 전체 부서 평가를 제출하시겠습니까?", "최종 제출", MessageBoxButton.YesNo);
            if (result == MessageBoxResult.Yes)
            {
                try
                {
                    // 1. Save current department
                    SaveCurrentEvaluation("TEMP");

                    // 2. Mark all as submitted
                    int masterId = _masterData?.MasterId ?? 1;
                    _dbService.SubmitAllEvaluations(masterId, _user.UserId);

                    IsReadOnly = true;
                    MessageBox.Show("최종 제출이 완료되었습니다.", "알림", MessageBoxButton.OK, MessageBoxImage.Information);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"제출 실패: {ex.Message}", "오류", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }
    }
}
