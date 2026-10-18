import * as migration_20261018_141013_initial from './20261018_141013_initial';

export const migrations = [
  {
    up: migration_20261018_141013_initial.up,
    down: migration_20261018_141013_initial.down,
    name: '20261018_141013_initial'
  },
];
