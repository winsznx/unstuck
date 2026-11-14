const GITHUB_REPO = /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}(\.git)?$/;
const FULL_SHA = /^[0-9a-f]{40}$/;
const IMAGE = /^[a-z0-9][a-z0-9._/-]*(:[A-Za-z0-9._-]+)?(@sha256:[0-9a-f]{64})?$/;

export function assertReplayInput(repoUrl: string, sha: string, image: string): void {
  if (!GITHUB_REPO.test(repoUrl)) throw new Error(`unsupported repo url: ${repoUrl}`);
  if (!FULL_SHA.test(sha)) throw new Error(`sha must be a full 40-char commit id: ${sha}`);
  if (!IMAGE.test(image)) throw new Error(`invalid image reference: ${image}`);
}
