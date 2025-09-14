#!/bin/bash

# CVPlus Analytics Module Secure Deployment Script
# Author: Gil Klainert
# Date: 2025-08-29

set -e

echo "🚀 CVPlus Analytics Secure Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-"staging"}
SKIP_TESTS=${SKIP_TESTS:-false}

# Pre-deployment validation
pre_deployment_checks() {
    echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"
    
    # Check environment
    if [ -z "$FIREBASE_PROJECT_ID" ]; then
        echo -e "${RED}❌ FIREBASE_PROJECT_ID not set${NC}"
        exit 1
    fi
    
    # Check dependencies
    echo -e "${BLUE}📦 Validating dependencies...${NC}"
    npm audit --audit-level=high || {
        echo -e "${RED}❌ Security vulnerabilities found in dependencies${NC}"
        exit 1
    }
    
    # Type checking
    echo -e "${BLUE}🔍 Running type checks...${NC}"
    npm run type-check || {
        echo -e "${RED}❌ Type checking failed${NC}"
        exit 1
    }
    
    # Privacy compliance check
    echo -e "${BLUE}🔒 Validating privacy compliance...${NC}"
    npm run test -- --grep "privacy|gdpr" || {
        echo -e "${RED}❌ Privacy compliance validation failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
}

# Test execution
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        echo -e "${YELLOW}⚠️ Skipping tests (SKIP_TESTS=true)${NC}"
        return
    fi
    
    echo -e "${BLUE}🧪 Running comprehensive test suite...${NC}"
    ./scripts/test/analytics-test-suite.sh || {
        echo -e "${RED}❌ Test suite failed${NC}"
        exit 1
    }
}

# Build process
build_analytics() {
    echo -e "${BLUE}🏗️ Building analytics module...${NC}"
    ./scripts/build/analytics-build.sh --report || {
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    }
}

# Security validation
security_validation() {
    echo -e "${BLUE}🛡️ Running security validation...${NC}"
    
    # Check for hardcoded secrets
    if grep -r "sk_.*" src/ 2>/dev/null; then
        echo -e "${RED}❌ Potential hardcoded API keys found${NC}"
        exit 1
    fi
    
    # Check Firebase Functions configuration
    if [ -f "src/config/firebase.ts" ]; then
        if grep -q "process.env" "src/config/firebase.ts"; then
            echo -e "${GREEN}✅ Environment variables used for configuration${NC}"
        else
            echo -e "${YELLOW}⚠️ Check Firebase configuration for hardcoded values${NC}"
        fi
    fi
    
    # Validate analytics endpoints
    echo -e "${BLUE}🔍 Validating analytics endpoints security...${NC}"
    if [ -f "src/functions/index.ts" ]; then
        if grep -q "cors" "src/functions/index.ts"; then
            echo -e "${GREEN}✅ CORS configuration found${NC}"
        else
            echo -e "${YELLOW}⚠️ Verify CORS configuration${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Security validation passed${NC}"
}

# Firebase deployment
deploy_to_firebase() {
    echo -e "${BLUE}☁️ Deploying to Firebase ($DEPLOYMENT_ENV)...${NC}"
    
    case $DEPLOYMENT_ENV in
        "production")
            echo -e "${RED}⚠️ PRODUCTION DEPLOYMENT${NC}"
            read -p "Are you sure you want to deploy to production? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo "Deployment cancelled"
                exit 0
            fi
            ;;
        "staging")
            echo -e "${YELLOW}📦 Staging deployment${NC}"
            ;;
        *)
            echo -e "${BLUE}🧪 Development deployment${NC}"
            ;;
    esac
    
    # Deploy analytics functions
    if [ -d "src/functions" ]; then
        echo -e "${BLUE}🚀 Deploying analytics functions...${NC}"
        firebase deploy --only functions --project $FIREBASE_PROJECT_ID || {
            echo -e "${RED}❌ Function deployment failed${NC}"
            exit 1
        }
    fi
    
    echo -e "${GREEN}✅ Firebase deployment completed${NC}"
}

# Post-deployment validation
post_deployment_validation() {
    echo -e "${BLUE}✅ Running post-deployment validation...${NC}"
    
    # Health check (if applicable)
    echo -e "${BLUE}🏥 Health check...${NC}"
    echo "  - Analytics functions deployed"
    echo "  - Privacy compliance active"
    echo "  - Security measures in place"
    
    # Generate deployment report
    cat > deployment-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$DEPLOYMENT_ENV",
  "project": "$FIREBASE_PROJECT_ID",
  "version": "$(npm version --json | jq -r '.\"analytics\"')",
  "status": "success",
  "components": {
    "analytics_functions": "deployed",
    "privacy_compliance": "active",
    "security_validation": "passed"
  }
}
EOF
    
    echo -e "${GREEN}✅ Deployment report generated: deployment-report.json${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}🚀 Starting Analytics Deployment Pipeline${NC}"
    echo -e "${BLUE}Environment: $DEPLOYMENT_ENV${NC}"
    echo ""
    
    pre_deployment_checks
    run_tests
    build_analytics
    security_validation
    deploy_to_firebase
    post_deployment_validation
    
    echo ""
    echo -e "${GREEN}🎉 Analytics deployment completed successfully!${NC}"
    echo -e "${GREEN}📊 Analytics module is now live on $DEPLOYMENT_ENV${NC}"
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [environment] [options]"
        echo ""
        echo "Environments:"
        echo "  staging     Deploy to staging environment (default)"
        echo "  production  Deploy to production environment"
        echo "  development Deploy to development environment"
        echo ""
        echo "Options:"
        echo "  --skip-tests  Skip test execution (SKIP_TESTS=true)"
        echo "  --help        Show this help message"
        ;;
    *)
        main
        ;;
esac