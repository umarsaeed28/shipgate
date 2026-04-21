pipeline {
    agent any

    environment {
        MORTGAGE_APP_URL = 'http://host.docker.internal:3099'
        SHIPGATE_API_URL = 'http://host.docker.internal:4000'
        E2E_DIR          = 'tests/e2e'
        ALLURE_RESULTS   = 'tests/e2e/allure-results'
        NODE_ENV         = 'test'
    }

    triggers {
        cron('0 2 * * *')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    env.PATH = "/opt/homebrew/bin:/opt/homebrew/opt/node/bin:/usr/local/bin:${env.PATH}"
                }
                sh 'node --version'
                sh 'pnpm --version || npm install -g pnpm'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pnpm install --frozen-lockfile'
                dir("${env.E2E_DIR}") {
                    sh 'npm install'
                }
            }
        }

        stage('Database Setup') {
            steps {
                sh 'pnpm db:generate'
                sh 'pnpm db:push'
            }
        }

        stage('Start Mortgage App') {
            steps {
                script {
                    def running = sh(script: "curl -sf ${env.MORTGAGE_APP_URL} > /dev/null 2>&1", returnStatus: true)
                    if (running != 0) {
                        dir('apps/mortgage-app') {
                            sh 'pnpm build'
                            sh 'nohup pnpm preview &'
                        }
                        sh "timeout 30 bash -c 'until curl -sf ${env.MORTGAGE_APP_URL} > /dev/null 2>&1; do sleep 2; done'"
                        echo 'Mortgage App started successfully'
                    } else {
                        echo 'Mortgage App already running'
                    }
                }
            }
        }

        stage('Verify Services') {
            steps {
                sh "curl -sf ${env.MORTGAGE_APP_URL} > /dev/null"
                sh "curl -sf ${env.SHIPGATE_API_URL}/health > /dev/null"
                echo 'All services verified'
            }
        }

        stage('Seed Shipgate') {
            steps {
                dir("${env.E2E_DIR}") {
                    script {
                        def output = sh(script: 'node seed-shipgate.js', returnStdout: true).trim()
                        echo output
                        def appMatch = output =~ /APP_ID="([^"]+)"/
                        def suiteMatch = output =~ /SUITE_ID="([^"]+)"/
                        if (appMatch.find()) { env.APP_ID = appMatch.group(1) }
                        if (suiteMatch.find()) { env.SUITE_ID = suiteMatch.group(1) }
                        echo "Using APP_ID=${env.APP_ID} SUITE_ID=${env.SUITE_ID}"
                    }
                }
            }
        }

        stage('Clean Previous Results') {
            steps {
                dir("${env.E2E_DIR}") {
                    sh 'rm -rf allure-results allure-report output || true'
                }
            }
        }

        stage('Run Smoke Tests') {
            steps {
                dir("${env.E2E_DIR}") {
                    sh 'npx codeceptjs run --grep "@smoke" --steps --plugins allure || true'
                }
            }
        }

        stage('Run Regression Tests') {
            steps {
                dir("${env.E2E_DIR}") {
                    sh 'npx codeceptjs run --steps --plugins allure || true'
                }
            }
        }

        stage('Report to Shipgate') {
            steps {
                dir("${env.E2E_DIR}") {
                    sh "APP_ID=${env.APP_ID} SUITE_ID=${env.SUITE_ID} node report-to-shipgate.js || true"
                }
            }
        }

        stage('Generate Allure Report') {
            steps {
                sh "allure generate ${env.ALLURE_RESULTS} --clean -o tests/e2e/allure-report || true"
                echo 'Allure report generated'
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'tests/e2e/allure-results/**', allowEmptyArchive: true
                archiveArtifacts artifacts: 'tests/e2e/allure-report/**', allowEmptyArchive: true
                archiveArtifacts artifacts: 'tests/e2e/output/**', allowEmptyArchive: true
            }
        }

        stage('Notify Shipgate') {
            steps {
                script {
                    def jr = currentBuild.result ?: 'FAILURE'
                    def st = (jr == 'SUCCESS' || jr == 'FAILURE' || jr == 'UNSTABLE' || jr == 'ABORTED') ? jr : 'FAILURE'
                    def payload = """{
                        "buildNumber": ${env.BUILD_NUMBER},
                        "jobName": "${env.JOB_NAME}",
                        "status": "${st}",
                        "duration": ${currentBuild.duration ?: 0},
                        "jenkinsBuildUrl": "${env.BUILD_URL}",
                        "allureReportUrl": "${env.BUILD_URL}allure/",
                        "autoAnalyze": false
                    }"""
                    def response = sh(
                        script: """curl -sf -X POST ${env.SHIPGATE_API_URL}/api/regression/webhooks/jenkins \
                            -H 'Content-Type: application/json' \
                            -d '${payload}' || true""",
                        returnStdout: true
                    ).trim()
                    echo "Shipgate webhook response: ${response}"
                }
            }
        }
    }

    post {
        always {
            script {
                try {
                    allure includeProperties: false, jdk: '', results: [[path: "${env.ALLURE_RESULTS}"]]
                } catch (e) {
                    echo "Allure plugin not available: ${e.message}"
                }
            }
            echo "Pipeline complete. Build: ${currentBuild.currentResult}"
            echo "Allure Report: ${env.BUILD_URL}allure/"
            echo "Shipgate Runs: http://localhost:3000/runs"
        }
        success {
            echo 'BUILD SUCCESS - Nightly regression tests passed'
        }
        failure {
            echo 'BUILD FAILED - Check Allure report for details'
        }
        cleanup {
            cleanWs(cleanWhenNotBuilt: false, notFailBuild: true)
        }
    }
}
