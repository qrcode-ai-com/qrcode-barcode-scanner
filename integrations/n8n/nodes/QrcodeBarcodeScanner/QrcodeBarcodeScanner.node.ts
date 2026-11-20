// SPDX-License-Identifier: MIT
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ENGINE_VERSION, LIMITS, scanImage, summarize } from './scanCore';

interface ScanNodeOptions {
	budgetMs?: number;
	includeReport?: boolean;
}

export class QrcodeBarcodeScanner implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QR Code & Barcode Scanner',
		name: 'qrcodeBarcodeScanner',
		icon: { light: 'file:qrcodeBarcodeScanner.svg', dark: 'file:qrcodeBarcodeScanner.dark.svg' },
		group: ['transform'],
		version: [1],
		subtitle: '={{"Profile: " + $parameter["profile"]}}',
		description: 'Read QR codes and barcodes in images, locally, with no API key',
		defaults: {
			name: 'QR Code & Barcode Scanner',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the input binary field that holds the image',
				description: 'PNG, JPEG, WebP or GIF image bytes, at most 8 MiB and 4096 pixels per side',
			},
			{
				displayName: 'Profile',
				name: 'profile',
				type: 'options',
				default: 'frame',
				options: [
					{
						name: 'Frame',
						value: 'frame',
						description: 'Decode every code without scoring. The quickest profile.',
					},
					{
						name: 'Fast',
						value: 'fast',
						description: 'Decode, then score QR codes with a short budget',
					},
					{
						name: 'Full',
						value: 'full',
						description: 'Decode and score QR scannability with the full budget',
					},
				],
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				default: 'image',
				options: [
					{
						name: 'One Item per Image',
						value: 'image',
						description: 'Return the decoded texts, the codes and the report of each image',
					},
					{
						name: 'One Item per Code',
						value: 'code',
						description: 'Return one item for each decoded code. An image without a code returns no item.',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Budget (Ms)',
						name: 'budgetMs',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0, maxValue: LIMITS.budgetMs },
						description:
							'Replace the time budget of the profile, in milliseconds. 0 removes the budget. It is not a hard timeout.',
					},
					{
						displayName: 'Include Report',
						name: 'includeReport',
						type: 'boolean',
						default: true,
						description:
							'Whether to add the complete scanner report to each image item, with scores, locations and trace',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const profile = this.getNodeParameter('profile', i) as string;
				const output = this.getNodeParameter('output', i) as string;
				const options = this.getNodeParameter('options', i, {}) as ScanNodeOptions;
				const binary = this.helpers.assertBinaryData(i, binaryPropertyName);
				const bytes = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
				const report = await scanImage(bytes, { profile, budgetMs: options.budgetMs });
				const summary = summarize(report);
				const image: IDataObject = {
					fileName: binary.fileName ?? null,
					mimeType: binary.mimeType,
					field: binaryPropertyName,
				};

				if (output === 'code') {
					summary.codes.forEach((code, index) => {
						returnData.push({
							json: { ...code, index, image } as IDataObject,
							pairedItem: { item: i },
						});
					});
					continue;
				}

				const json: IDataObject = {
					texts: summary.texts,
					codes: summary.codes as unknown as IDataObject[],
					count: summary.count,
					profile,
					engine: ENGINE_VERSION,
					image,
				};
				if (options.includeReport !== false) json.report = report as unknown as IDataObject;
				returnData.push({ json, binary: items[i].binary, pairedItem: { item: i } });
			} catch (error) {
				const code = (error as { code?: string }).code;
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message, code: code ?? null },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
					description: code ? `Scanner error ${code}` : undefined,
				});
			}
		}

		return [returnData];
	}
}
