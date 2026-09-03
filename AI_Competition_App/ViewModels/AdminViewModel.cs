using System.Collections.ObjectModel;
using System.Linq;
using AI_Competition_App.Models;
using AI_Competition_App.Services;

namespace AI_Competition_App.ViewModels
{
    public class AdminViewModel : BaseViewModel
    {
        private readonly DatabaseService _dbService;

        public ObservableCollection<string> Departments { get; } = new ObservableCollection<string>();

        private string _selectedDepartment;
        public string SelectedDepartment
        {
            get => _selectedDepartment;
            set
            {
                _selectedDepartment = value;
                OnPropertyChanged();
                LoadData();
            }
        }

        private double _totalAverage;
        public double TotalAverage
        {
            get => _totalAverage;
            set { _totalAverage = value; OnPropertyChanged(); }
        }

        private double _practicalAvg;
        public double PracticalAvg
        {
            get => _practicalAvg;
            set { _practicalAvg = value; OnPropertyChanged(); }
        }

        private double _efficiencyAvg;
        public double EfficiencyAvg
        {
            get => _efficiencyAvg;
            set { _efficiencyAvg = value; OnPropertyChanged(); }
        }

        private double _innovationAvg;
        public double InnovationAvg
        {
            get => _innovationAvg;
            set { _innovationAvg = value; OnPropertyChanged(); }
        }

        private double _scalabilityAvg;
        public double ScalabilityAvg
        {
            get => _scalabilityAvg;
            set { _scalabilityAvg = value; OnPropertyChanged(); }
        }

        public ObservableCollection<EvaluationRecordModel> EvaluationsList { get; set; } = new ObservableCollection<EvaluationRecordModel>();
        public ObservableCollection<DepartmentSummaryModel> DepartmentSummaryList { get; set; } = new ObservableCollection<DepartmentSummaryModel>();

        public ObservableCollection<string> DepartmentOrderList { get; set; } = new ObservableCollection<string>();
        private string _selectedOrderDepartment;
        public string SelectedOrderDepartment
        {
            get => _selectedOrderDepartment;
            set 
            { 
                _selectedOrderDepartment = value; 
                if (value != null) InputDepartmentName = value;
                OnPropertyChanged(); 
                System.Windows.Input.CommandManager.InvalidateRequerySuggested(); 
            }
        }

        private string _inputDepartmentName;
        public string InputDepartmentName
        {
            get => _inputDepartmentName;
            set { _inputDepartmentName = value; OnPropertyChanged(); System.Windows.Input.CommandManager.InvalidateRequerySuggested(); }
        }

        public RelayCommand MoveUpCommand { get; }
        public RelayCommand MoveDownCommand { get; }
        public RelayCommand SaveOrderCommand { get; }
        public RelayCommand AddDepartmentCommand { get; }
        public RelayCommand EditDepartmentCommand { get; }
        public RelayCommand DeleteDepartmentCommand { get; }

        public AdminViewModel()
        {
            _dbService = new DatabaseService();
            
            MoveUpCommand = new RelayCommand(_ => MoveUp(), _ => SelectedOrderDepartment != null && DepartmentOrderList.IndexOf(SelectedOrderDepartment) > 0);
            MoveDownCommand = new RelayCommand(_ => MoveDown(), _ => SelectedOrderDepartment != null && DepartmentOrderList.IndexOf(SelectedOrderDepartment) < DepartmentOrderList.Count - 1);
            SaveOrderCommand = new RelayCommand(_ => SaveOrder());
            
            AddDepartmentCommand = new RelayCommand(_ => AddDepartment(), _ => !string.IsNullOrWhiteSpace(InputDepartmentName) && !DepartmentOrderList.Contains(InputDepartmentName.Trim()));
            EditDepartmentCommand = new RelayCommand(_ => EditDepartment(), _ => SelectedOrderDepartment != null && !string.IsNullOrWhiteSpace(InputDepartmentName) && InputDepartmentName.Trim() != SelectedOrderDepartment && !DepartmentOrderList.Contains(InputDepartmentName.Trim()));
            DeleteDepartmentCommand = new RelayCommand(_ => DeleteDepartment(), _ => SelectedOrderDepartment != null);

            // Load Departments
            var order = _dbService.GetDepartmentOrder();
            Departments.Clear();
            Departments.Add("전체 부서");
            foreach (var dept in order)
            {
                Departments.Add(dept);
                DepartmentOrderList.Add(dept);
            }

            SelectedDepartment = Departments[0]; // Triggers LoadData
        }

        private void MoveUp()
        {
            int index = DepartmentOrderList.IndexOf(SelectedOrderDepartment);
            if (index > 0)
            {
                DepartmentOrderList.Move(index, index - 1);
                System.Windows.Input.CommandManager.InvalidateRequerySuggested();
            }
        }

        private void MoveDown()
        {
            int index = DepartmentOrderList.IndexOf(SelectedOrderDepartment);
            if (index < DepartmentOrderList.Count - 1)
            {
                DepartmentOrderList.Move(index, index + 1);
                System.Windows.Input.CommandManager.InvalidateRequerySuggested();
            }
        }

        private void AddDepartment()
        {
            string newName = InputDepartmentName?.Trim();
            if (!string.IsNullOrWhiteSpace(newName) && !DepartmentOrderList.Contains(newName))
            {
                DepartmentOrderList.Add(newName);
                InputDepartmentName = "";
            }
        }

        private void EditDepartment()
        {
            string newName = InputDepartmentName?.Trim();
            if (SelectedOrderDepartment != null && !string.IsNullOrWhiteSpace(newName) && !DepartmentOrderList.Contains(newName))
            {
                int index = DepartmentOrderList.IndexOf(SelectedOrderDepartment);
                if (index >= 0)
                {
                    DepartmentOrderList[index] = newName;
                    SelectedOrderDepartment = newName;
                }
            }
        }

        private void DeleteDepartment()
        {
            if (SelectedOrderDepartment != null)
            {
                DepartmentOrderList.Remove(SelectedOrderDepartment);
                InputDepartmentName = "";
            }
        }

        private void SaveOrder()
        {
            try
            {
                _dbService.SaveDepartmentOrder(DepartmentOrderList.ToList());
                System.Windows.MessageBox.Show("부서 평가 순서가 저장되었습니다.\n(재시작 시 또는 다시 로그인 시 전체 적용됩니다.)", "알림", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Information);
            }
            catch (System.Exception ex)
            {
                System.Windows.MessageBox.Show($"저장 실패: {ex.Message}", "오류", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Error);
            }
        }

        private void LoadData()
        {
            var allEvals = _dbService.GetAllEvaluations(1).ToList(); // Assuming master_id = 1
            
            // 1. 부서별 집계 (전체 데이터 기준)
            var summaries = allEvals.GroupBy(e => e.DepartmentName)
                .Select(g => new DepartmentSummaryModel
                {
                    DepartmentName = g.Key,
                    EvaluationCount = g.Count(),
                    PracticalAvg = g.Average(x => x.ScorePractical),
                    EfficiencyAvg = g.Average(x => x.ScoreEfficiency),
                    InnovationAvg = g.Average(x => x.ScoreInnovation),
                    ScalabilityAvg = g.Average(x => x.ScoreScalability),
                    TotalAverage = g.Average(x => x.TotalScore)
                }).ToList();

            DepartmentSummaryList.Clear();
            if (SelectedDepartment != null && SelectedDepartment != "전체 부서")
            {
                var targetSummary = summaries.FirstOrDefault(s => s.DepartmentName == SelectedDepartment);
                if (targetSummary != null)
                {
                    DepartmentSummaryList.Add(targetSummary);
                }
            }
            else
            {
                foreach (var s in summaries)
                {
                    DepartmentSummaryList.Add(s);
                }
            }

            // 2. 평가자별 집계 (필터 적용된 데이터 기준)
            var filteredEvals = allEvals;
            if (SelectedDepartment != null && SelectedDepartment != "전체 부서")
            {
                filteredEvals = filteredEvals.Where(e => e.DepartmentName == SelectedDepartment).ToList();
            }

            EvaluationsList.Clear();
            var users = _dbService.GetUsers();
            foreach (var eval in filteredEvals)
            {
                var user = users.FirstOrDefault(u => u.UserId == eval.EvaluatorId);
                eval.EvaluatorName = user != null ? user.UserName : eval.EvaluatorId;
                EvaluationsList.Add(eval);
            }

            // 전체 요약 수치 (상단 Bento Card용)
            if (filteredEvals.Any())
            {
                TotalAverage = filteredEvals.Average(e => e.TotalScore);
                PracticalAvg = filteredEvals.Average(e => e.ScorePractical);
                EfficiencyAvg = filteredEvals.Average(e => e.ScoreEfficiency);
                InnovationAvg = filteredEvals.Average(e => e.ScoreInnovation);
                ScalabilityAvg = filteredEvals.Average(e => e.ScoreScalability);
            }
            else
            {
                TotalAverage = 0; PracticalAvg = 0; EfficiencyAvg = 0; InnovationAvg = 0; ScalabilityAvg = 0;
            }
        }
    }
}
