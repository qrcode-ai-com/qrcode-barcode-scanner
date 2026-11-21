<?php
/**
 * Server-side render of the scanner block.
 *
 * @package QRCodeBarcodeScanner
 *
 * @var array $attributes The block attributes.
 */

defined( 'ABSPATH' ) || exit;

echo qrcode_barcode_scanner_markup( $attributes, get_block_wrapper_attributes() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is escaped in qrcode_barcode_scanner_markup().
