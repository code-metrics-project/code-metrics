#!/bin/bash
#
# SonarQube Analysis Runner for Monorepo
# Automatically discovers and runs sonar-scanner in all configured subdirectories
#
# Usage:
#   ./scripts/run-sonar-analysis.sh                    # Run all projects
#   ./scripts/run-sonar-analysis.sh backend frontend   # Run specific projects
#   ./scripts/run-sonar-analysis.sh --list             # List all configured projects
#
# Environment Variables:
#   SONAR_HOST_URL  - SonarQube server URL (default: http://localhost:9000)
#   SONAR_TOKEN     - Authentication token (required)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory of the monorepo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Default SonarQube settings
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"

# Function to print colored messages
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if sonar-scanner is installed
check_sonar_scanner() {
    if ! command -v sonar-scanner &> /dev/null; then
        log_error "sonar-scanner is not installed!"
        echo ""
        echo "Install sonar-scanner using one of these methods:"
        echo ""
        echo "  macOS (Homebrew):"
        echo "    brew install sonar-scanner"
        echo ""
        echo "  npm (global):"
        echo "    npm install -g sonarqube-scanner"
        echo ""
        echo "  Manual download:"
        echo "    https://docs.sonarqube.org/latest/analyzing-source-code/scanners/sonarscanner/"
        echo ""
        exit 1
    fi
}

# Find all directories with sonar-project.properties
find_sonar_projects() {
    find "$ROOT_DIR" -name "sonar-project.properties" -type f 2>/dev/null | \
        xargs -I {} dirname {} | \
        sed "s|$ROOT_DIR/||" | \
        grep -v "node_modules" | \
        sort
}

# List all configured projects
list_projects() {
    log_info "SonarQube configured projects in monorepo:"
    echo ""
    
    while IFS= read -r project; do
        local props_file="$ROOT_DIR/$project/sonar-project.properties"
        local project_key=$(grep "^sonar.projectKey=" "$props_file" 2>/dev/null | cut -d'=' -f2)
        local project_name=$(grep "^sonar.projectName=" "$props_file" 2>/dev/null | cut -d'=' -f2)
        echo -e "  ${GREEN}$project${NC}"
        echo -e "    Key:  $project_key"
        echo -e "    Name: $project_name"
        echo ""
    done <<< "$(find_sonar_projects)"
}

# Run sonar-scanner in a specific directory
run_analysis() {
    local project_dir="$1"
    local full_path="$ROOT_DIR/$project_dir"
    
    if [[ ! -f "$full_path/sonar-project.properties" ]]; then
        log_error "No sonar-project.properties found in $project_dir"
        return 1
    fi
    
    local project_key=$(grep "^sonar.projectKey=" "$full_path/sonar-project.properties" 2>/dev/null | cut -d'=' -f2)
    
    log_info "Running analysis for: $project_dir ($project_key)"
    
    cd "$full_path"
    
    local cmd="sonar-scanner -Dsonar.host.url=$SONAR_HOST_URL"
    
    if [[ -n "$SONAR_TOKEN" ]]; then
        cmd="$cmd -Dsonar.token=$SONAR_TOKEN"
    else
        log_warning "SONAR_TOKEN not set - analysis may fail if authentication is required"
    fi
    
    if eval "$cmd"; then
        log_success "Analysis completed for $project_dir"
        return 0
    else
        log_error "Analysis failed for $project_dir"
        return 1
    fi
}

# Main execution
main() {
    local failed_projects=()
    local success_count=0
    local projects_to_run=()
    
    # Parse arguments
    if [[ "$1" == "--list" ]] || [[ "$1" == "-l" ]]; then
        list_projects
        exit 0
    fi
    
    if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        echo "Usage: $0 [OPTIONS] [PROJECTS...]"
        echo ""
        echo "Options:"
        echo "  --list, -l    List all configured projects"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  SONAR_HOST_URL  SonarQube server URL (default: http://localhost:9000)"
        echo "  SONAR_TOKEN     Authentication token (required for most servers)"
        echo ""
        echo "Examples:"
        echo "  $0                           # Run all projects"
        echo "  $0 backend frontend          # Run specific projects"
        echo "  SONAR_TOKEN=xxx $0 backend   # Run with token"
        exit 0
    fi
    
    # Check dependencies
    check_sonar_scanner
    
    log_info "SonarQube Host: $SONAR_HOST_URL"
    echo ""
    
    # Determine which projects to run
    if [[ $# -gt 0 ]]; then
        # Specific projects provided as arguments
        projects_to_run=("$@")
    else
        # Run all discovered projects
        while IFS= read -r project; do
            projects_to_run+=("$project")
        done <<< "$(find_sonar_projects)"
    fi
    
    if [[ ${#projects_to_run[@]} -eq 0 ]]; then
        log_warning "No SonarQube projects found in monorepo"
        exit 0
    fi
    
    log_info "Projects to analyze: ${#projects_to_run[@]}"
    echo ""
    
    # Run analysis for each project
    for project in "${projects_to_run[@]}"; do
        echo "─────────────────────────────────────────────────────────────"
        if run_analysis "$project"; then
            ((success_count++))
        else
            failed_projects+=("$project")
        fi
        echo ""
    done
    
    # Summary
    echo "═════════════════════════════════════════════════════════════"
    log_info "Analysis Summary"
    echo ""
    echo -e "  ${GREEN}Successful:${NC} $success_count"
    echo -e "  ${RED}Failed:${NC}     ${#failed_projects[@]}"
    
    if [[ ${#failed_projects[@]} -gt 0 ]]; then
        echo ""
        log_error "Failed projects:"
        for project in "${failed_projects[@]}"; do
            echo "    - $project"
        done
        exit 1
    fi
    
    echo ""
    log_success "All analyses completed successfully!"
}

main "$@"
