import * as migration_20261018_141013_initial from './20261018_141013_initial';
import * as migration_20261018_151612_media_and_logo from './20261018_151612_media_and_logo';
import * as migration_20261019_154410_pages_and_page_links from './20261019_154410_pages_and_page_links';

export const migrations = [
  {
    up: migration_20261018_141013_initial.up,
    down: migration_20261018_141013_initial.down,
    name: '20261018_141013_initial',
  },
  {
    up: migration_20261018_151612_media_and_logo.up,
    down: migration_20261018_151612_media_and_logo.down,
    name: '20261018_151612_media_and_logo',
  },
  {
    up: migration_20261019_154410_pages_and_page_links.up,
    down: migration_20261019_154410_pages_and_page_links.down,
    name: '20261019_154410_pages_and_page_links'
  },
];
