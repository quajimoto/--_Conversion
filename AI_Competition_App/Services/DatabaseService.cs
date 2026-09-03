using System.Collections.Generic;
using System.Data;
using System.Linq;
using Dapper;
using MySqlConnector;
using AI_Competition_App.Models;

namespace AI_Competition_App.Services
{
    public class DatabaseService
    {
        // For local testing without a real NAS, assuming a local MySQL instance or just default placeholder
        private readonly string _connectionString = "Server=localhost;Port=3306;Database=AI_Competition_DB;Uid=root;Pwd=root;AllowUserVariables=True;";

        private IDbConnection GetConnection()
        {
            return new MySqlConnection(_connectionString);
        }

        public string GetAuthType()
        {
            try
            {
                using (var db = GetConnection())
                {
                    string sql = "SELECT config_value FROM system_configs WHERE config_key = 'AUTH_TYPE'";
                    var result = db.QueryFirstOrDefault<string>(sql);
                    return result ?? "SIMPLE";
                }
            }
            catch
            {
                // Return default if DB fails to connect (for testing UI without DB)
                return "SIMPLE";
            }
        }

        private static List<string> _tempOrder = null;
        private static List<EvaluationRecordModel> _tempEvaluations = new List<EvaluationRecordModel>();

        public List<string> GetDepartmentOrder()
        {
            // ALWAYS try to read from local JSON first for reliability in mock environments
            string filePath = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "temp_dept_order.json");
            if (System.IO.File.Exists(filePath))
            {
                try {
                    _tempOrder = System.Text.Json.JsonSerializer.Deserialize<List<string>>(System.IO.File.ReadAllText(filePath));
                    if (_tempOrder != null && _tempOrder.Count > 0)
                        return _tempOrder;
                } catch { }
            }

            try
            {
                using (var db = GetConnection())
                {
                    string sql = "SELECT config_value FROM system_configs WHERE config_key = 'DEPT_ORDER'";
                    var result = db.QueryFirstOrDefault<string>(sql);
                    if (!string.IsNullOrEmpty(result))
                    {
                        var list = result.Split(',').ToList();
                        _tempOrder = list;
                        return list;
                    }
                }
            }
            catch { }

            return _tempOrder ?? new List<string> { "프레스생산팀", "차체생산팀", "도장생산팀", "조립생산팀" };
        }

        public void SaveDepartmentOrder(List<string> departments)
        {
            _tempOrder = new List<string>(departments);
            
            // ALWAYS save to local JSON file for persistence across restarts
            try {
                string filePath = System.IO.Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "temp_dept_order.json");
                System.IO.File.WriteAllText(filePath, System.Text.Json.JsonSerializer.Serialize(_tempOrder));
            } catch { }

            try
            {
                using (var db = GetConnection())
                {
                    string orderStr = string.Join(",", departments);
                    string sql = @"
                        INSERT INTO system_configs (config_key, config_value, description) 
                        VALUES ('DEPT_ORDER', @OrderStr, '부서 평가 순서')
                        ON DUPLICATE KEY UPDATE config_value = @OrderStr;";
                    db.Execute(sql, new { OrderStr = orderStr });
                }
            }
            catch { }
        }

        public List<UserModel> GetUsers()
        {
            try
            {
                using (var db = GetConnection())
                {
                    string sql = "SELECT user_id AS UserId, user_name AS UserName, role AS Role FROM users";
                    return db.Query<UserModel>(sql).ToList();
                }
            }
            catch
            {
                // Dummy data for UI testing without DB
                return new List<UserModel>
                {
                    new UserModel { UserId = "EMP001", UserName = "홍길동", Role = "USER" },
                    new UserModel { UserId = "EMP002", UserName = "김철수", Role = "USER" },
                    new UserModel { UserId = "EMP003", UserName = "이영희", Role = "USER" },
                    new UserModel { UserId = "ADMIN001", UserName = "시스템관리자", Role = "ADMIN" }
                };
            }
        }

        public EvaluationMasterModel GetActiveCompetitionMaster()
        {
            try
            {
                using (var db = GetConnection())
                {
                    string sql = "SELECT master_id AS MasterId, competition_name AS CompetitionName, max_practical AS MaxPractical, max_efficiency AS MaxEfficiency, max_innovation AS MaxInnovation, max_scalability AS MaxScalability, is_active AS IsActive FROM evaluation_master WHERE is_active = 1 LIMIT 1";
                    return db.QueryFirstOrDefault<EvaluationMasterModel>(sql);
                }
            }
            catch
            {
                // Dummy data for UI testing
                return new EvaluationMasterModel
                {
                    MasterId = 1,
                    CompetitionName = "2026 AI 경진대회 2차",
                    MaxPractical = 30,
                    MaxEfficiency = 30,
                    MaxInnovation = 20,
                    MaxScalability = 20,
                    IsActive = true
                };
            }
        }

        public void SaveEvaluation(EvaluationRecordModel eval)
        {
            try
            {
                using (var connection = GetConnection())
                {
                    var query = @"
                        INSERT INTO evaluations (master_id, department_name, evaluator_id, score_practical, score_efficiency, score_innovation, score_scalability, submit_status)
                        VALUES (@MasterId, @DepartmentName, @EvaluatorId, @ScorePractical, @ScoreEfficiency, @ScoreInnovation, @ScoreScalability, @SubmitStatus)
                        ON DUPLICATE KEY UPDATE 
                            score_practical = @ScorePractical,
                            score_efficiency = @ScoreEfficiency,
                            score_innovation = @ScoreInnovation,
                            score_scalability = @ScoreScalability,
                            submit_status = @SubmitStatus,
                            submit_time = CURRENT_TIMESTAMP;";
                    connection.Execute(query, eval);
                }
            }
            catch
            {
                var existing = _tempEvaluations.FirstOrDefault(e => e.MasterId == eval.MasterId && e.EvaluatorId == eval.EvaluatorId && e.DepartmentName == eval.DepartmentName);
                if (existing != null)
                {
                    existing.ScorePractical = eval.ScorePractical;
                    existing.ScoreEfficiency = eval.ScoreEfficiency;
                    existing.ScoreInnovation = eval.ScoreInnovation;
                    existing.ScoreScalability = eval.ScoreScalability;
                    existing.SubmitStatus = eval.SubmitStatus;
                    existing.TotalScore = eval.ScorePractical + eval.ScoreEfficiency + eval.ScoreInnovation + eval.ScoreScalability;
                }
                else
                {
                    eval.TotalScore = eval.ScorePractical + eval.ScoreEfficiency + eval.ScoreInnovation + eval.ScoreScalability;
                    _tempEvaluations.Add(eval);
                }
            }
        }

        public IEnumerable<EvaluationRecordModel> GetAllEvaluations(int masterId)
        {
            try
            {
                using (var connection = GetConnection())
                {
                    var query = "SELECT master_id AS MasterId, department_name AS DepartmentName, evaluator_id AS EvaluatorId, score_practical AS ScorePractical, score_efficiency AS ScoreEfficiency, score_innovation AS ScoreInnovation, score_scalability AS ScoreScalability, total_score AS TotalScore, submit_status AS SubmitStatus FROM evaluations WHERE master_id = @MasterId";
                    return connection.Query<EvaluationRecordModel>(query, new { MasterId = masterId }).ToList();
                }
            }
            catch
            {
                // Dummy data for UI testing when DB is not available
                return new List<EvaluationRecordModel>
                {
                    new EvaluationRecordModel { MasterId = 1, DepartmentName = "프레스생산팀", EvaluatorId = "EMP001", ScorePractical = 25, ScoreEfficiency = 28, ScoreInnovation = 15, ScoreScalability = 18, TotalScore = 86, SubmitStatus = "SUBMITTED" },
                    new EvaluationRecordModel { MasterId = 1, DepartmentName = "프레스생산팀", EvaluatorId = "EMP002", ScorePractical = 20, ScoreEfficiency = 25, ScoreInnovation = 18, ScoreScalability = 15, TotalScore = 78, SubmitStatus = "SUBMITTED" },
                    new EvaluationRecordModel { MasterId = 1, DepartmentName = "차체생산팀", EvaluatorId = "EMP001", ScorePractical = 28, ScoreEfficiency = 26, ScoreInnovation = 19, ScoreScalability = 19, TotalScore = 92, SubmitStatus = "SUBMITTED" },
                    new EvaluationRecordModel { MasterId = 1, DepartmentName = "도장생산팀", EvaluatorId = "EMP003", ScorePractical = 22, ScoreEfficiency = 22, ScoreInnovation = 16, ScoreScalability = 16, TotalScore = 76, SubmitStatus = "SUBMITTED" }
                };
            }
        }

        public List<EvaluationRecordModel> GetEvaluationsForUser(int masterId, string userId)
        {
            try
            {
                using (var connection = GetConnection())
                {
                    var query = "SELECT master_id AS MasterId, department_name AS DepartmentName, evaluator_id AS EvaluatorId, score_practical AS ScorePractical, score_efficiency AS ScoreEfficiency, score_innovation AS ScoreInnovation, score_scalability AS ScoreScalability, total_score AS TotalScore, submit_status AS SubmitStatus FROM evaluations WHERE master_id = @MasterId AND evaluator_id = @UserId";
                    return connection.Query<EvaluationRecordModel>(query, new { MasterId = masterId, UserId = userId }).ToList();
                }
            }
            catch
            {
                return _tempEvaluations.Where(e => e.MasterId == masterId && e.EvaluatorId == userId).ToList();
            }
        }

        public void SubmitAllEvaluations(int masterId, string userId)
        {
            try
            {
                using (var connection = GetConnection())
                {
                    var query = "UPDATE evaluations SET submit_status = 'SUBMITTED' WHERE master_id = @MasterId AND evaluator_id = @UserId";
                    connection.Execute(query, new { MasterId = masterId, UserId = userId });
                }
            }
            catch
            {
                var evals = _tempEvaluations.Where(e => e.MasterId == masterId && e.EvaluatorId == userId);
                foreach (var eval in evals)
                {
                    eval.SubmitStatus = "SUBMITTED";
                }
            }
        }
    }
}
