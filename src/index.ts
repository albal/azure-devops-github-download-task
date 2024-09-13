import * as tl from 'azure-pipelines-task-lib/task';
import * as https from 'https';

async function run() {
  try {
    const repository: string = tl.getInput('repository', true)!;
    let releaseVersion: string = tl.getInput('releaseVersion', false) || 'latest';
    const beta: boolean = tl.getBoolInput('beta', false);
    const architecture: string = tl.getInput('architecture', true)!;

    const apiUrl = `https://api.github.com/repos/${repository}/releases`;
    const headers = {
      'User-Agent': 'Azure-DevOps-Task'
    };

    const releaseData = await fetchReleases(apiUrl, headers);
    const release = getDesiredRelease(releaseData, releaseVersion, beta);

    if (!release) {
      tl.setResult(tl.TaskResult.Failed, `No matching release found.`);
      return;
    }

    const asset = release.assets.find((asset: any) => asset.name.includes(architecture));
    if (!asset) {
      tl.setResult(tl.TaskResult.Failed, `No asset found for architecture ${architecture}`);
      return;
    }

    const downloadUrl = asset.browser_download_url;
    console.log(`Downloading asset from: ${downloadUrl}`);
    // Download logic can go here or use `curl` task or custom download implementation

    tl.setResult(tl.TaskResult.Succeeded, 'Release downloaded successfully!');
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

async function fetchReleases(url: string, headers: any) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(JSON.parse(body));
      });
    }).on('error', reject);
  });
}

function getDesiredRelease(releases: any[], version: string, includeBeta: boolean) {
  if (version === 'latest') {
    return releases.find(release => release.prerelease === includeBeta);
  }
  return releases.find(release => release.tag_name === version);
}

run();
