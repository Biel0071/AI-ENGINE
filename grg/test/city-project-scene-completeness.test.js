'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { projectSceneSites } = require('../public/fenix-city-machine-scene');

test('every registered project receives a stable, unique City location', () => {
  const projects = Array.from({ length: 62 }, (_, index) => ({
    id: `project-${index}`,
    name: `Project ${index}`,
    status: index === 4 ? 'RUNNING' : 'IDLE',
    workspace: `workspace-${index}`,
  }));

  const sites = projectSceneSites(projects);

  assert.equal(sites.length, projects.length);
  assert.deepEqual(sites.map((site) => site.id), projects.map((project) => project.id));
  assert.equal(new Set(sites.map((site) => `${site.position.x}:${site.position.z}`)).size, sites.length);
  assert.deepEqual(sites, projectSceneSites(projects));
});

test('City project activity is derived only from jobs linked to that project', () => {
  const [site] = projectSceneSites(
    [{ id: 'project-real', name: 'Real project', status: 'IDLE' }],
    [{ id: 'job-real', projectId: 'project-real', status: 'RUNNING' }],
  );

  assert.equal(site.id, 'project-real');
  assert.equal(site.activityStatus, 'RUNNING');
  assert.equal(site.runningJobs, 1);
});
