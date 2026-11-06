import { TEST_DB_URI } from './test-database';

// Runs before every test file: the application under test connects to the test database.
// ConfigModule does not override variables that are already present in process.env.
process.env.MONGODB_URI = TEST_DB_URI;
process.env.NODE_ENV = 'test';
