import { Connection, SfError, PollingClient, Logger, StatusResult } from '@salesforce/core';

import { Duration } from '@salesforce/kit';
import { AnyJson } from '@salesforce/ts-types';

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

export class CommunitiesExistsUtil {
  /**
   * This queries the existence of a community
   *
   * @param conn
   * @param name - the name of the community
   * @returns {Promise<Boolean>}
   */
  public static async queryCommunityExists(conn: Connection, name: string): Promise<boolean> {
    // eslint-disa ble-next-line @typescript-eslint/no-unsafe-assignment
    const communitiesList: CommunitiesRestResult = await conn.request(`${conn.baseUrl()}/connect/communities/`);
    return communitiesList.communities.some((c) => c.siteAsContainerEnabled && c.name === name);
  }

  /**
   * This retrieves the community status, polling until the status is True
   *
   * @param conn
   * @param name - the name of the community
   * @param timeout - A Duration object
   * @returns {Promise<Boolean>}
   */
  public static async pollCommunityExists(
    conn: Connection,
    name: string,
    timeout: Duration = Duration.minutes(DEFAULT_TIMEOUT_MINUTES)
  ): Promise<boolean> {
    const logger = await Logger.child('exists-pollCommunityExists');
    logger.debug(`PollingTimeout in minutes: ${timeout.minutes}`);

    const pollingOptions: PollingClient.Options = {
      async poll(): Promise<StatusResult> {
        try {
          const resultInProgress = await CommunitiesExistsUtil.queryCommunityExists(conn, name);
          logger.debug(`polling community existence: ${JSON.stringify(resultInProgress, null, 2)}`);

          if (resultInProgress === true) {
            return {
              completed: true,
              payload: resultInProgress as unknown as AnyJson,
            };
          }

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
      frequency: Duration.seconds(30),
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
  }
}
