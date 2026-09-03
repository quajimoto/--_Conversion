namespace AI_Competition_App.Models
{
    public class EvaluationMasterModel
    {
        public int MasterId { get; set; }
        public string CompetitionName { get; set; }
        public int MaxPractical { get; set; }
        public int MaxEfficiency { get; set; }
        public int MaxInnovation { get; set; }
        public int MaxScalability { get; set; }
        public bool IsActive { get; set; }
    }

    public class EvaluationRecordModel
    {
        public int MasterId { get; set; }
        public string DepartmentName { get; set; }
        public string EvaluatorId { get; set; }
        public string EvaluatorName { get; set; }
        public int ScorePractical { get; set; }
        public int ScoreEfficiency { get; set; }
        public int ScoreInnovation { get; set; }
        public int ScoreScalability { get; set; }
        public int TotalScore { get; set; }
        public string SubmitStatus { get; set; } // 'TEMP' or 'SUBMITTED'
    }

    public class DepartmentSummaryModel
    {
        public string DepartmentName { get; set; }
        public double PracticalAvg { get; set; }
        public double EfficiencyAvg { get; set; }
        public double InnovationAvg { get; set; }
        public double ScalabilityAvg { get; set; }
        public double TotalAverage { get; set; }
        public int EvaluationCount { get; set; }
    }
}
