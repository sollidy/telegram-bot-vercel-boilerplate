import axios from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_OWNER = 'timthealer';
const GITHUB_REPO = 'TT3Dato';
const BRANCH = 'master';

export async function getGitHubFile(path: string): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const res = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    return Buffer.from(res.data.content, 'base64').toString('utf-8');
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function putGitHubFile(path: string, content: string, commitMsg: string) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const encoded = Buffer.from(content, 'utf-8').toString('base64');
  let sha: string | undefined;
  try {
    const existing = await axios.get(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    sha = existing.data.sha;
  } catch {}
  const payload: any = {
    message: commitMsg,
    content: encoded,
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;
  await axios.put(url, payload, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
}
