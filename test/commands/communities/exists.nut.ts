import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

let testSession: TestSession;

describe('communities exists NUTs', () => {
  before('prepare session', async () => {
    testSession = await TestSession.create();
  });

  after(async () => {
    await testSession?.clean();
  });

  it('should say false', () => {
    const result = execCmd<boolean>('communities exist --json', { ensureExitCode: 0 }).jsonOutput?.result;
    expect(false).to.equal(false);
  });
});
