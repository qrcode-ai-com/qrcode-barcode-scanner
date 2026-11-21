/**
 * The scanner block in the editor: a preview of what visitors see, and its three settings.
 * The page itself is rendered by render.php, so the block saves no markup.
 */
import { registerBlockType } from '@wordpress/blocks';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, Placeholder, SelectControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from './block.json';

// Three finder squares and a few modules: a small QR code drawn for the block inserter.
const icon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
		<path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9-2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h3v2h-3v-2zm-4 4h2v3h-2v-3zm4 0h3v3h-3v-3zm-2 2h2v1h-2v-1z" />
	</svg>
);

function Edit( { attributes, setAttributes } ) {
	const { profile, showReport, showCredit } = attributes;
	return (
		<div { ...useBlockProps() }>
			<InspectorControls>
				<PanelBody title={ __( 'Scanner', 'qrcode-barcode-scanner' ) }>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Profile chosen first', 'qrcode-barcode-scanner' ) }
						help={ __( 'Visitors can change it before or after a scan.', 'qrcode-barcode-scanner' ) }
						value={ profile }
						options={ [
							{ value: 'full', label: __( 'full, the most thorough', 'qrcode-barcode-scanner' ) },
							{ value: 'fast', label: __( 'fast, for clear images', 'qrcode-barcode-scanner' ) },
							{ value: 'frame', label: __( 'frame, the quickest', 'qrcode-barcode-scanner' ) },
						] }
						onChange={ ( value ) => setAttributes( { profile: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show the full report', 'qrcode-barcode-scanner' ) }
						help={ __( 'A section with the complete JSON report of the last scan.', 'qrcode-barcode-scanner' ) }
						checked={ showReport }
						onChange={ ( value ) => setAttributes( { showReport: value } ) }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Show a credit line', 'qrcode-barcode-scanner' ) }
						help={ __( 'A sentence about the open-source engine with links to QR Code AI. Off unless you turn it on.', 'qrcode-barcode-scanner' ) }
						checked={ showCredit }
						onChange={ ( value ) => setAttributes( { showCredit: value } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<Placeholder
				icon={ icon }
				label={ __( 'QR Code & Barcode Scanner', 'qrcode-barcode-scanner' ) }
				instructions={ __( 'Visitors choose an image or take a photo, and the codes it holds are listed as text. The image is read in their browser and is never uploaded. Preview the page to try it.', 'qrcode-barcode-scanner' ) }
			/>
		</div>
	);
}

registerBlockType( metadata.name, { icon, edit: Edit, save: () => null } );
