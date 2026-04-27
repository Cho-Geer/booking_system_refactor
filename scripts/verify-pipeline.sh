#!/bin/bash
set -e

echo "🔍 验证CI/CD流水线完整性..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数器
total_checks=0
passed_checks=0
failed_checks=0

# 函数：检查文件是否存在
check_file() {
  local file="$1"
  local description="$2"
  
  ((total_checks++))
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ ${description}${NC}"
    ((passed_checks++))
    return 0
  else
    echo -e "${RED}❌ ${description} - 文件不存在: ${file}${NC}"
    ((failed_checks++))
    return 1
  fi
}

# 函数：检查文件内容
check_file_content() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  
  ((total_checks++))
  
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo -e "${GREEN}✅ ${description}${NC}"
    ((passed_checks++))
    return 0
  else
    echo -e "${RED}❌ ${description} - 未找到模式: ${pattern}${NC}"
    ((failed_checks++))
    return 1
  fi
}

# 函数：检查YAML语法
check_yaml() {
  local file="$1"
  local description="$2"
  
  ((total_checks++))
  
  if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
    echo -e "${GREEN}✅ ${description} (YAML语法正确)${NC}"
    ((passed_checks++))
    return 0
  else
    echo -e "${RED}❌ ${description} - YAML语法错误${NC}"
    ((failed_checks++))
    return 1
  fi
}

echo "=== 1. 核心文件检查 ==="
check_file "Task.DAG.json" "任务依赖图"
check_file "Project.graph" "项目架构图"
check_file "routing-strategy.md" "路由策略文档"
check_file "arch-constraints.md" "架构约束文档"

echo -e "\n=== 2. 工作流文件检查 ==="
check_file ".github/workflows/orchestrator.yml" "主调度工作流"
check_file ".github/workflows/task-template.yml" "任务模板工作流"
check_file ".github/workflows/ci-cd-agent-workflow.yml" "CI/CD Agent工作流"
check_file ".github/workflows/arbiter-waiver.yml" "Arbiter豁免工作流"

echo -e "\n=== 3. 工作流内容验证 ==="
check_yaml ".github/workflows/orchestrator.yml" "orchestrator.yml"
check_yaml ".github/workflows/task-template.yml" "task-template.yml"
check_yaml ".github/workflows/ci-cd-agent-workflow.yml" "ci-cd-agent-workflow.yml"
check_yaml ".github/workflows/arbiter-waiver.yml" "arbiter-waiver.yml"

echo -e "\n=== 4. 模板文件检查 ==="
check_file "WAIVER.md" "豁免文件模板"
check_file "BUILD_REPORT.md" "构建报告模板"

echo -e "\n=== 5. 关键配置检查 ==="
# 检查orchestrator中的变量校验
check_file_content ".github/workflows/orchestrator.yml" "Validate required variables" "orchestrator变量校验步骤"
check_file_content ".github/workflows/orchestrator.yml" "DOCKER_HUB_USER" "DOCKER_HUB_USER变量引用"

# 检查task-template中的Guardian重试逻辑
check_file_content ".github/workflows/task-template.yml" "Handle Guardian retry logic" "Guardian重试逻辑"
check_file_content ".github/workflows/task-template.yml" "Trigger Arbiter workflow" "Arbiter触发逻辑"

# 检查CI/CD Agent工作流中的任务类型识别
check_file_content ".github/workflows/ci-cd-agent-workflow.yml" "T020.*docker_configuration" "T020任务识别"
check_file_content ".github/workflows/ci-cd-agent-workflow.yml" "T021.*ci_cd_pipeline" "T021任务识别"
check_file_content ".github/workflows/ci-cd-agent-workflow.yml" "T022.*deployment_configuration" "T022任务识别"
check_file_content ".github/workflows/ci-cd-agent-workflow.yml" "T023.*system_integration" "T023任务识别"

echo -e "\n=== 6. 智能体分工验证 ==="
# 检查Task.DAG.json中的智能体分配
check_file_content "Task.DAG.json" '"T020".*"@CI-CD-Agent"' "T020分配给@CI-CD-Agent"
check_file_content "Task.DAG.json" '"T021".*"@CI-CD-Agent"' "T021分配给@CI-CD-Agent"
check_file_content "Task.DAG.json" '"T022".*"@CI-CD-Agent"' "T022分配给@CI-CD-Agent"
check_file_content "Task.DAG.json" '"T023".*"@CI-CD-Agent"' "T023分配给@CI-CD-Agent"
check_file_content "Task.DAG.json" '"T018".*"@Guardian"' "T018分配给@Guardian"
check_file_content "Task.DAG.json" '"T001".*"@Meta-Planner"' "T001分配给@Meta-Planner"

echo -e "\n=== 7. 合规性检查 ==="
# 检查全局CI/CD实践规则合规性
check_file_content ".github/workflows/orchestrator.yml" "timeout-minutes: 15" "orchestrator超时设置(Rule 7)"
check_file_content ".github/workflows/task-template.yml" "# Rule 5: Secret management" "密钥管理注释(Rule 5)"
check_file_content ".github/workflows/ci-cd-agent-workflow.yml" "# TOOLCHAIN JUSTIFICATION" "工具链说明(Rule 3)"
check_file_content ".github/workflows/orchestrator.yml" "# Rule 6: Observability metric export" "可观测性指标导出(Rule 6)"

echo -e "\n=== 8. 脚本文件检查 ==="
check_file "scripts/verify-pipeline.sh" "流水线验证脚本"

echo -e "\n=== 验证结果汇总 ==="
echo "总共检查项: $total_checks"
echo -e "${GREEN}通过: $passed_checks${NC}"
echo -e "${RED}失败: $failed_checks${NC}"

if [ $failed_checks -eq 0 ]; then
  echo -e "\n${GREEN}🎉 所有检查通过！CI/CD流水线配置完整且合规。${NC}"
  
  # 显示关键路径摘要
  echo -e "\n📋 关键路径摘要:"
  echo "1. @Meta-Planner: T001, T024 (项目规划与总结)"
  echo "2. @Architect: T002, T003, T005 (架构设计)"
  echo "3. @Coder-BE: T010, T011 (后端实现)"
  echo "4. @Tester: T015 (测试)"
  echo "5. @Guardian: T018 (代码审查)"
  echo "6. @CI-CD-Agent: T020, T021, T022, T023 (CI/CD与部署)"
  echo "7. @Arbiter: Guardian失败后自动触发 (豁免管理)"
  echo "8. @Orchestrator: 全程调度"
  
  echo -e "\n🚀 流水线已就绪，可以开始自动化构建。"
  exit 0
else
  echo -e "\n${RED}⚠️  发现 $failed_checks 个问题，请修复后再继续。${NC}"
  exit 1
fi