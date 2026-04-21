# Jenkins Local Setup Guide

Instructions for running the Shipgate regression pipeline locally with Jenkins.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop
- Allure CLI (`brew install allure`)

## 1. Install Jenkins

### Option A: Homebrew (macOS)

```bash
brew install jenkins-lts
brew services start jenkins-lts
```

Jenkins will be available at http://localhost:8080.

Get the initial admin password:

```bash
cat /opt/homebrew/var/jenkins/secrets/initialAdminPassword
```

### Option B: Docker

```bash
docker run -d \
  --name jenkins \
  -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

Jenkins will be available at http://localhost:9090.

Get the initial admin password:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## 2. Initial Jenkins Configuration

1. Open Jenkins in your browser
2. Enter the initial admin password
3. Install **suggested plugins** plus these additional ones:
   - **Allure Jenkins Plugin** - for test report visualization
   - **NodeJS Plugin** - for Node.js/pnpm support
   - **Pipeline** - should be included by default
4. Create an admin user

## 3. Configure Node.js

1. Go to **Manage Jenkins → Tools**
2. Under **NodeJS installations**, click **Add NodeJS**
3. Name: `node-20`
4. Version: `NodeJS 20.x`
5. Global npm packages: `pnpm allure-commandline`
6. Save

## 4. Create the Pipeline Job

### From Jenkinsfile (recommended)

1. Click **New Item**
2. Name: `shipgate-nightly-regression`
3. Select **Pipeline**, click OK
4. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: path to your local repo or Git remote
   - Script Path: `Jenkinsfile`
5. Save

### From XML Config

```bash
# Import the smoke pipeline config
java -jar jenkins-cli.jar -s http://localhost:9090/ create-job smoke-test-pipeline < .jenkins/smoke-pipeline.xml
```

### Manual Pipeline Script

1. Click **New Item**
2. Name: `shipgate-nightly-regression`
3. Select **Pipeline**, click OK
4. Under **Pipeline**:
   - Definition: **Pipeline script**
   - Paste the contents of `Jenkinsfile` from the repo root
5. Save

## 5. Configure Credentials (if needed)

If your repo is private or you need API keys:

1. Go to **Manage Jenkins → Credentials**
2. Click **(global)** → **Add Credentials**
3. Add any needed credentials:
   - Git credentials for repo access
   - API tokens for external integrations

## 6. Configure the Nightly Trigger

The `Jenkinsfile` already includes a cron trigger (`0 2 * * *` = 2:00 AM daily).

To verify or modify:

1. Open the job → **Configure**
2. Under **Build Triggers**, check **Build periodically**
3. Schedule: `0 2 * * *`

## 7. Trigger Manually

### From Jenkins UI

1. Open the job
2. Click **Build Now**
3. Watch the console output under **Build History → Console Output**

### From CLI

```bash
# Using Jenkins CLI
java -jar jenkins-cli.jar -s http://localhost:9090/ build shipgate-nightly-regression

# Using curl
curl -X POST http://localhost:9090/job/shipgate-nightly-regression/build \
  --user admin:YOUR_API_TOKEN
```

### Without Jenkins

Use the simulation script to run the full pipeline locally without Jenkins:

```bash
./infra/scripts/simulate-nightly.sh
```

## 8. View Results

- **Jenkins Console**: Click on a build number → Console Output
- **Allure Report**: Click on a build number → Allure Report (if plugin installed)
- **Shipgate UI**: http://localhost:3000/runs - see analyzed test results
- **Artifacts**: Click on a build number → archived artifacts for raw Allure data

## Troubleshooting

**"node: command not found"**
Configure the NodeJS plugin or ensure `/opt/homebrew/bin` is in Jenkins PATH.

**"pnpm: command not found"**
Install pnpm globally via the NodeJS plugin config or `npm install -g pnpm`.

**"allure: command not found"**
Install Allure CLI: `brew install allure` or add `allure-commandline` to NodeJS plugin global packages.

**Tests fail with "Cannot connect to localhost:3099"**
Start the mortgage app first: `cd apps/mortgage-app && pnpm dev`

**Allure plugin shows empty report**
Ensure `allure-results` directory is being correctly archived. Check the "Collect Allure Results" stage output.
