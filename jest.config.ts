import { JestConfigWithTsJest } from 'ts-jest'

const createProject = (displayName: string, testRegex: string): JestConfigWithTsJest => {
	return {
		displayName,
		testRegex,
		preset: 'ts-jest',
		restoreMocks: true,
		modulePaths: ['./'],
	}
}

module.exports = {
	projects: [
		createProject('unit', '\\.spec\\.ts$'),
		createProject('e2e', '\\.spec-e2e\\.ts$'),
	],
	collectCoverageFrom: [
		'src/**/*.(t|j)s',
	],
	coverageDirectory: './coverage',
	coveragePathIgnorePatterns: [
		'(module|main|index|config|dto).ts',
		'/common/',
		'/migrations/',
	],
	coverageReporters: [
		'text',
		'html',
		'text-summary',
	],
} as JestConfigWithTsJest
