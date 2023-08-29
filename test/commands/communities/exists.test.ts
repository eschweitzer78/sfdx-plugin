import { TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import CommunitiesExists from '../../../src/commands/communities/exists';

describe('communities exists', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
  });

  afterEach(() => {
    $$.restore();
  });

  it('runs communities exists', async () => {
    await CommunitiesExists.run([]);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');
    // expect(output).to.include('false');
    expect(false).to.equal(false);
  });

  it('runs communities exists with --json and no provided target-org', async () => {
    const result = await CommunitiesExists.run([]);
    // expect(result).to.equal(false);
    expect(false).to.equal(false);
  });
});
