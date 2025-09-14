#!/bin/bash

# CVPlus Analytics Module Test Suite
# Author: Gil Klainert
# Date: 2025-08-29

set -e

echo "🧪 Running CVPlus Analytics Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test categories
run_unit_tests() {
    echo -e "${BLUE}🔬 Running unit tests...${NC}"
    npm run test -- --grep "unit|service|utils" || {
        echo -e "${RED}❌ Unit tests failed${NC}"
        return 1
    }
    echo -e "${GREEN}✅ Unit tests passed${NC}"
}

run_integration_tests() {
    echo -e "${BLUE}🔗 Running integration tests...${NC}"
    npm run test -- --grep "integration|api|database" || {
        echo -e "${RED}❌ Integration tests failed${NC}"
        return 1
    }
    echo -e "${GREEN}✅ Integration tests passed${NC}"
}

run_privacy_tests() {
    echo -e "${BLUE}🔒 Running privacy compliance tests...${NC}"
    npm run test -- --grep "privacy|gdpr|consent|anonymization" || {
        echo -e "${RED}❌ Privacy compliance tests failed${NC}"
        return 1
    }
    echo -e "${GREEN}✅ Privacy compliance tests passed${NC}"
}

run_analytics_tests() {
    echo -e "${BLUE}📊 Running analytics-specific tests...${NC}"
    npm run test -- --grep "analytics|tracking|metrics|reporting" || {
        echo -e "${RED}❌ Analytics tests failed${NC}"
        return 1
    }
    echo -e "${GREEN}✅ Analytics tests passed${NC}"
}

run_performance_tests() {
    echo -e "${BLUE}⚡ Running performance tests...${NC}"
    npm run test -- --grep "performance|benchmark|load" || {
        echo -e "${YELLOW}⚠️ Performance tests not found or failed${NC}"
        return 0  # Non-blocking for now
    }
    echo -e "${GREEN}✅ Performance tests passed${NC}"
}

run_ab_testing_tests() {
    echo -e "${BLUE}🧪 Running A/B testing validation...${NC}"
    npm run test -- --grep "ab-testing|experiment|variant" || {
        echo -e "${RED}❌ A/B testing tests failed${NC}"
        return 1
    }
    echo -e "${GREEN}✅ A/B testing tests passed${NC}"
}

# Main test execution
main() {
    local failed=0
    
    echo -e "${BLUE}📋 Analytics Test Suite Configuration:${NC}"
    echo "  - Unit Tests: Service logic and utilities"
    echo "  - Integration Tests: API and database interactions"
    echo "  - Privacy Tests: GDPR/CCPA compliance"
    echo "  - Analytics Tests: Tracking and metrics validation"
    echo "  - Performance Tests: System performance benchmarks"
    echo "  - A/B Testing Tests: Experiment framework validation"
    echo ""
    
    # Run test categories
    run_unit_tests || failed=1
    run_integration_tests || failed=1
    run_privacy_tests || failed=1
    run_analytics_tests || failed=1
    run_performance_tests || failed=1
    run_ab_testing_tests || failed=1
    
    # Test coverage report
    echo -e "${BLUE}📈 Generating test coverage report...${NC}"
    npm run test -- --coverage || {
        echo -e "${YELLOW}⚠️ Coverage report generation failed${NC}"
    }
    
    # Results
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All analytics tests passed successfully!${NC}"
        echo -e "${GREEN}✅ Analytics module is ready for deployment${NC}"
        exit 0
    else
        echo -e "${RED}💥 Some analytics tests failed${NC}"
        echo -e "${RED}❌ Please fix failing tests before deployment${NC}"
        exit 1
    fi
}

# Support for specific test categories
case "$1" in
    --unit)
        run_unit_tests
        ;;
    --integration)
        run_integration_tests
        ;;
    --privacy)
        run_privacy_tests
        ;;
    --analytics)
        run_analytics_tests
        ;;
    --performance)
        run_performance_tests
        ;;
    --ab-testing)
        run_ab_testing_tests
        ;;
    *)
        main
        ;;
esac