import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection, SfError, StateAggregator } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { CommunitiesExistsUtil } from '../../shared/communitiesExistsUtil';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@eschweitzer78/sfdx-plugin', 'communities.exists');

export default class CommunitiesExists extends SfCommand<boolean> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      required: true,
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
    }),
    timelimit: Flags.integer({
      char: 'w',
      summary: messages.getMessage('flags.timelimit.summary'),
      description: messages.getMessage('flags.timelimit.description'),
      default: 4,
    }),
    'target-org': Flags.string({
      char: 'u',
      required: true,
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
    }),
  };

  public async run(): Promise<boolean> {
    const { flags } = await this.parse(CommunitiesExists);

    const stateAggregator = await StateAggregator.getInstance();

    const targetOrg = stateAggregator.aliases.resolveUsername(flags['target-org']);

    if (targetOrg === undefined) {
      throw new SfError(`Alias or user ${flags['target-org']} not set.`);
    }

    const authInfo = await AuthInfo.create({ username: targetOrg });
    const connection = await Connection.create({ authInfo });

    const r = await CommunitiesExistsUtil.pollCommunityExists(
      connection,
      flags.name,
      Duration.minutes(flags.timelimit)
    );

    this.log(r ? 'true' : 'false');
    return r;
  }
}
