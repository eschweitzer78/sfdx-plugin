import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { expect } from 'chai';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import CommunitiesExists from '../../../src/commands/communities/exists';
import { CommunitiesExistsUtil } from '../../../src/shared/communitiesExistsUtil';

describe('communities:exists', () => {
  const $$ = new TestContext();
  let testOrg = new MockTestOrgData();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    testOrg = new MockTestOrgData();
    testOrg.orgId = '00Dxx0000000000';
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
  });

  afterEach(() => {
    $$.restore();
  });

  it('fails with no provided target-org', async () => {
    await $$.stubAuths(testOrg);

    try {
      await CommunitiesExists.run(['--name', 'cde', '-w', '1']);
      expect.fail('should have thrown an error');
    } catch (e) {
      const err = e as SfError;
      expect(err.name).to.equal('Error');
    }
  });

  it('runs communities exists', async () => {
    testOrg.aliases = ['nonscratchalias'];
    $$.stubAliases({ nonscratchalias: testOrg.username });
    await $$.stubAuths(testOrg);
    $$.SANDBOX.stub(CommunitiesExistsUtil, 'queryCommunityExists').resolves(true);

    await CommunitiesExists.run(['--json', '--target-org', 'nonscratchalias', '--name', 'cde', '-w', '1']);
    const output = sfCommandStubs.log
      .getCalls()
      .flatMap((c) => c.args)
      .join('\n');

    expect(output).to.include('true');
  });

  it('runs communities exists leading to client timeout', async () => {
    await $$.stubAuths(testOrg);

    try {
      await CommunitiesExists.run(['--target-org', testOrg.username, '--name', 'cde', '-w', '1']);
      expect.fail('should time out');
    } catch (e) {
      const err = e as SfError;
      expect(err.name).to.equal('CommunityExistsTimeoutError');
    }
  });

  it('runs communities exists leading to normal timeout', async () => {
    await $$.stubAuths(testOrg);
    $$.SANDBOX.stub(CommunitiesExistsUtil, 'queryCommunityExists').resolves(false);

    try {
      await CommunitiesExists.run(['--target-org', testOrg.username, '--name', 'cde', '-w', '1']);
      expect.fail('should time out');
    } catch (e) {
      const err = e as SfError;
      expect(err.name).to.equal('CommunityExistsTimeoutError');
    }
  });
});
