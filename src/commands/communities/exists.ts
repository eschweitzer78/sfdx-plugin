import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  Messages,
  AuthInfo,
  Connection,
  SfError,
  PollingClient,
  Logger,
  StatusResult,
  StateAggregator,
} from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { AnyJson } from '@salesforce/ts-types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@eschweitzer78/sfdx-plugin', 'communities.exists');

const DEFAULT_TIMEOUT_MINUTES = 2;

interface CommunitiesRestResult {
  communities: [
    {
      name: string;
      id: string;
      siteAsContainerEnabled: boolean;
    }
  ];
}

/**
 * This queries the existence of a community
 *
 * @param conn
 * @param name - the name of the community
 * @returns {Promise<Boolean>}
 */
const queryCommunityExists = async (conn: Connection, name: string): Promise<boolean> => {
  if (name && name.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const communitiesList: CommunitiesRestResult = await conn.request(`${conn.baseUrl()}/connect/communities/`);
    return communitiesList.communities.some((c) => c.siteAsContainerEnabled && c.name === name);
  }

  return false;
};

/**
 * This retrieves the community status, polling until the status is True
 *
 * @param conn
 * @param name - the name of the community
 * @param timeout - A Duration object
 * @returns {Promise<Boolean>}
 */
export const pollCommunityExists = async (
  conn: Connection,
  name: string,
  timeout: Duration = Duration.minutes(DEFAULT_TIMEOUT_MINUTES)
): Promise<boolean> => {
  const logger = await Logger.child('exists-pollCommunityExists');
  logger.debug(`PollingTimeout in minutes: ${timeout.minutes}`);

  const pollingOptions: PollingClient.Options = {
    async poll(): Promise<StatusResult> {
      try {
        const resultInProgress = await queryCommunityExists(conn, name);
        logger.debug(`polling community existence: ${JSON.stringify(resultInProgress, null, 2)}`);

        if (resultInProgress === true) {
          return {
            completed: true,
            payload: resultInProgress as unknown as AnyJson,
          };
        }

        // await emit({ stage: 'wait for community status', existsInfo: resultInProgress});

        logger.debug(`Community status is ${resultInProgress}`);
        return {
          completed: false,
        };
      } catch (error) {
        logger.debug(`An error occurred trying to retrieve community status for ${name}`);
        logger.debug(`Error: ${(error as Error).message}`);
        logger.debug('Re-trying status check again....');

        return {
          completed: false,
        };
      }
    },
    timeout,
    frequency: Duration.seconds(15),
    timeoutErrorName: 'CommunityExistsTimeoutError',
  };

  const client = await PollingClient.create(pollingOptions);

  try {
    const resultInProgress = await client.subscribe<boolean>();
    return resultInProgress;
  } catch (error) {
    if (error instanceof Error) {
      const sfError = SfError.wrap(error);
      sfError.setData({
        username: conn.getUsername(),
        orgId: conn.getAuthInfo().getFields().orgId,
        name,
      });
      throw sfError;
    }

    throw new SfError(
      `The community check did not complete within ${timeout.minutes} minutes`,
      'commmunityExistsTimeout',
      ['Try your commmand gain with a longer --wait value']
    );
  }
};

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

    const r = await pollCommunityExists(connection, flags.name, Duration.minutes(flags.timelimit));

    this.log(r ? 'true' : 'false');
    return r;
  }
}
