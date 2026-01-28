module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@lib/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@lib/database(|/.*)$': '<rootDir>/libs/database/src/$1',
    '^@lib/queue(|/.*)$': '<rootDir>/libs/queue/src/$1',
    '^@lib/events(|/.*)$': '<rootDir>/libs/events/src/$1',
  },
};
