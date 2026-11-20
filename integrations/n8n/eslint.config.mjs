// This node depends on the scanner engine package at run time and runs it in a worker thread, so
// it targets self-hosted n8n only: the n8n Cloud rules for verified nodes are not applied. Three
// rules are turned off, each for a stated reason; every other community node rule applies.
import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
	...configWithoutCloudSupport,
	{
		files: ['package.json'],
		rules: {
			// The engine stays its own package, pinned exactly, with its own license and .wasm file.
			// Inlining it would change what this package's MIT license covers.
			'@n8n/community-nodes/no-runtime-dependencies': 'off',
		},
	},
	{
		files: ['nodes/**/*.node.ts'],
		rules: {
			// The node reads image bytes from the incoming item's binary field. An AI agent's tool
			// call carries no binary data, so the node is not offered as a tool.
			'@n8n/community-nodes/node-usable-as-tool': 'off',
		},
	},
	{
		files: ['nodes/**/scanCore.ts'],
		rules: {
			// The shared core is host-neutral. The node turns each ScanError into a NodeOperationError.
			'@n8n/community-nodes/require-node-api-error': 'off',
		},
	},
];
