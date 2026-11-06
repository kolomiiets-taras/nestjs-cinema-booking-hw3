import { TEST_DB } from './test-database';

// Runs before every test file: the application under test connects to the test database.
// ConfigModule does not override variables that are already present in process.env.
process.env.POSTGRES_DB = TEST_DB;
process.env.NODE_ENV = 'test';
