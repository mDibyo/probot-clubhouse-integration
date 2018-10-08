const Clubhouse = require('clubhouse-lib');

const STORY_STATES = {
  UNSCHEDULED: 'Unscheduled',
  READY_FOR_DEVELOPMENT: 'Ready for Development',
  NEXT_UP: 'Next Up',
  IN_DEVELOPMENT: 'In Development',
  READY_FOR_REVIEW: 'Ready for Review',
  COMPLETED: 'Completed',
};

const LABEL_STORY_MAP = {
  'needs more work': STORY_STATES.IN_DEVELOPMENT,
  'ready for review': STORY_STATES.READY_FOR_REVIEW,
};

class ClubhouseClient {
  constructor() {
    this.client = Clubhouse.create(process.env.CLUBHOUSE_API_TOKEN);

    this.states = this.client.listWorkflows().then((data) => {
      this.states = data[0].states;
    });
  }

  async updateStoryState(storyId, state) {
    const stateId = await this.getStateId(state);
    this.client.updateStory(storyId, {workflow_state_id: stateId});
  }

  async getStateId(name) {
    const states = await this.states;
    const state = states.find(s => s.name === name);
    return state && state.id;
  }
}

function clubhouseStoryId(pullRequest) {
  const storyRe = /ch(\d+)/;
  const branchName = pullRequest.head.ref;
  const match = storyRe.exec(branchName);
  return match && match[1];
};

module.exports = (robot) => {
  const client = new ClubhouseClient();
  console.log('Yay, the app was loaded!');

  robot.on('pull_request.labeled', async context => {
    robot.log.debug('Pull request labeled!');
    const labelName = context.payload.label.name;
    const storyId = clubhouseStoryId(context.payload.pull_request);
    const newStoryState = LABEL_STORY_MAP[labelName];

    if (storyId && newStoryState) {
      robot.log.debug(`Moving story ${storyId} to "${newStoryState}"`)
      client.updateStoryState(storyId, newStoryState);
    }
  });

  robot.on('pull_request.unlabeled', async context => {
    const labelName = context.payload.label.name;
    const oldStoryState = LABEL_STORY_MAP[labelName];

    if (oldStoryState) {
      robot.log.debug('Pull request unlabeled!');
    }
  });
};
